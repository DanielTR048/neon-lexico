package com.neonlexico.game

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.UUID

data class SyncOutcome(val kind: String,val message: String,val save: SaveData?=null)
private class SyncHttpError(val status: Int,message: String): Exception(message)
class CloudSync(private val repository: GameRepository,private val api: String="https://lexicon-laboratorio.nexcoreadm.chatgpt.site") {
    private val conflicts=mutableMapOf<String,String>()
    fun newCode()=UUID.randomUUID().toString().replace("-","")
    fun format(code: String)="LEX-"+code.uppercase(Locale.ROOT).chunked(4).joinToString("-")
    fun connect(input: String,create: Boolean): String {
        val code=input.trim().replace(Regex("^LEX-",RegexOption.IGNORE_CASE),"").replace(Regex("[-\\s]"),"").lowercase(Locale.ROOT)
        require(code.matches(Regex("[a-f0-9]{32}"))) { "Copie o código completo, começando com LEX-." }
        check(request("family",code,if(create) "POST" else "GET")!=null) { "Código não encontrado. Copie o código do outro aparelho." }
        check(repository.connectCode(code)) { "O aparelho não conseguiu guardar o código." }
        synchronized(this) { conflicts.clear() };return code
    }
    @Synchronized fun sync(id: String,resolve: String?=null): SyncOutcome {
        val code=repository.syncCode();if(code.isEmpty()) return SyncOutcome("local","Salvo neste aparelho")
        return runCatching {
            val local=repository.load(id);val before=SaveCodec.encode(local);val meta=repository.syncMeta(id)
            val remote=request("neon/profiles/$id",code)
            if(repository.syncCode()!=code||SaveCodec.encode(repository.load(id))!=before) return SyncOutcome("pending","Alterações aguardando envio")
            val etag=remote?.getString("etag");val remoteSave=remote?.let { SaveCodec.decode(it.getJSONObject("save").toString()) }
            val dirty=meta.optBoolean("dirty",true)||(meta.has("snapshot")&&meta.optString("snapshot")!=before)
            fun conflict(): SyncOutcome {
                conflicts[id]=etag.orEmpty()
                fun count(save: SaveData?)=save?.results?.values?.sumOf { it.size }?:0
                return SyncOutcome("conflict","Neste aparelho: ${count(local)} fases concluídas. Online: ${count(remoteSave)} fases concluídas. Escolha qual progresso manter; uma cópia do outro será guardada.")
            }
            if(resolve!=null&&remote!=null&&conflicts[id]!=etag) return conflict()
            if(remote!=null&&dirty&&meta.optString("etag")!=etag&&SaveCodec.meaningful(local)&&resolve==null&&SaveCodec.encode(remoteSave!!)!=before) return conflict()
            if(remote!=null&&(resolve=="cloud"||!dirty||(!SaveCodec.meaningful(local)&&meta.optString("etag")!=etag))) {
                if(resolve=="cloud") check(repository.keepBackup(id,before))
                if(!repository.saveCloud(id,remoteSave!!,etag!!,before,code)) return SyncOutcome("pending","Alterações aguardando envio")
                conflicts.remove(id);return SyncOutcome("loaded","Sincronizado",remoteSave)
            }
            if(remote!=null&&SaveCodec.encode(remoteSave!!)==before) {
                val changed=repository.acknowledge(id,etag!!,before,code)
                conflicts.remove(id);return SyncOutcome(if(changed==false) "saved" else "pending",if(changed==false) "Sincronizado" else "Alterações aguardando envio")
            }
            if(resolve=="local"&&remote!=null) check(repository.keepBackup(id,remote.getJSONObject("save").toString()))
            val headers=if(remote==null) mapOf("If-None-Match" to "*") else mapOf("If-Match" to "\"$etag\"")
            val response=request("neon/profiles/$id",code,"PUT",before,headers)?:error("Falha ao enviar o progresso.")
            val changed=repository.acknowledge(id,response.getString("etag"),before,code)
            conflicts.remove(id);SyncOutcome(if(changed==false) "saved" else "pending",if(changed==false) "Sincronizado" else "Alterações aguardando envio")
        }.getOrElse { SyncOutcome("offline",if(it is IllegalArgumentException) "O progresso recebido não é compatível. Seu salvamento local foi preservado." else if(it is SyncHttpError&&it.status==409) "Progresso mudou em outro aparelho. Toque em sincronizar." else "Salvo no aparelho · aguardando conexão") }
    }
    private fun request(path: String,code: String,method: String="GET",body: String?=null,headers: Map<String,String> = emptyMap()): JSONObject? {
        val connection=URL("$api/api/$path").openConnection() as HttpURLConnection
        try {
            connection.requestMethod=method;connection.connectTimeout=12000;connection.readTimeout=12000
            connection.setRequestProperty("Authorization","Bearer $code");connection.setRequestProperty("Content-Type","application/json")
            headers.forEach { (key,value) -> connection.setRequestProperty(key,value) }
            if(body!=null) { connection.doOutput=true;connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) } }
            val status=connection.responseCode;if(status==404) return null
            val stream=if(status in 200..299) connection.inputStream else connection.errorStream
            val raw=stream?.use { input -> val out=java.io.ByteArrayOutputStream();val buffer=ByteArray(8192);while(true) { val read=input.read(buffer);if(read<0) break;require(out.size()+read<=SaveCodec.MAX_BYTES+1024);out.write(buffer,0,read) };out.toString("UTF-8") }.orEmpty()
            val response=if(raw.isEmpty()) JSONObject() else JSONObject(raw)
            if(status !in 200..299) throw SyncHttpError(status,response.optString("error","Não foi possível sincronizar."))
            return response
        } finally { connection.disconnect() }
    }
}
