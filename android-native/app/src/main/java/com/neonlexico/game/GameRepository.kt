package com.neonlexico.game

import android.content.Context
import org.json.JSONObject

class GameRepository(context: Context) {
    private val context=context.applicationContext
    private val prefs=context.getSharedPreferences("neon-lexico",Context.MODE_PRIVATE)
    fun catalog(): List<Theme> = context.assets.open("catalog.json").bufferedReader(Charsets.UTF_8).use { SaveCodec.catalog(it.readText()) }
    init {
        synchronized(LOCK) {
            if(!prefs.contains(key("daniel"))) {
                val old=prefs.getString("neon-lexico:v1",null)?:prefs.getString("state",null)
                val legacy=old?.let { runCatching { SaveCodec.decode(it) }.getOrNull() }?:SaveData()
                val edit=prefs.edit().putString(key("daniel"),SaveCodec.encode(legacy)).putString(key("larissa"),SaveCodec.encode(SaveData()))
                check(edit.commit()) { "O aparelho não conseguiu preparar o armazenamento." }
            } else if(!prefs.contains(key("larissa"))) check(prefs.edit().putString(key("larissa"),SaveCodec.encode(SaveData())).commit())
        }
    }
    private fun key(id: String): String { require(id in FIXED_PLAYERS.map { it.id });return "save:$id" }
    fun load(id: String): SaveData = synchronized(LOCK) { SaveCodec.decode(prefs.getString(key(id),null)?:error("Progresso ausente.")) }
    fun save(id: String,save: SaveData): Boolean = synchronized(LOCK) {
        val meta=syncMeta(id).put("dirty",true)
        prefs.edit().putString(key(id),SaveCodec.encode(save)).putString("meta:$id",meta.toString()).commit()
    }
    fun saveIfChanged(id: String,save: SaveData): Boolean = synchronized(LOCK) {
        val json=SaveCodec.encode(save)
        if(prefs.getString(key(id),null)==json) return true
        val meta=syncMeta(id).put("dirty",true)
        prefs.edit().putString(key(id),json).putString("meta:$id",meta.toString()).commit()
    }
    fun syncCode(): String = prefs.getString("sync-code","").orEmpty()
    fun connectCode(code: String): Boolean = synchronized(LOCK) {
        val editor=prefs.edit().putString("sync-code",code)
        if(code!=syncCode()) FIXED_PLAYERS.forEach { editor.remove("meta:${it.id}") }
        editor.commit()
    }
    fun syncMeta(id: String): JSONObject = synchronized(LOCK) { key(id);runCatching { JSONObject(prefs.getString("meta:$id","{}").orEmpty()) }.getOrDefault(JSONObject()) }
    fun setSyncMeta(id: String,meta: JSONObject): Boolean = synchronized(LOCK) { key(id);prefs.edit().putString("meta:$id",meta.toString()).commit() }
    fun acknowledge(id: String,etag: String,before: String,code: String): Boolean? = synchronized(LOCK) {
        if(syncCode()!=code) return null
        val changed=SaveCodec.encode(load(id))!=before
        check(setSyncMeta(id,JSONObject().put("etag",etag).put("dirty",changed).put("snapshot",before)))
        changed
    }
    fun keepBackup(id: String,json: String): Boolean = synchronized(LOCK) { key(id);prefs.edit().putString("backup:$id:${System.currentTimeMillis()}",json).commit() }
    fun saveCloud(id: String,save: SaveData,etag: String,before: String,code: String): Boolean = synchronized(LOCK) {
        if(syncCode()!=code||SaveCodec.encode(load(id))!=before) return false
        val json=SaveCodec.encode(save);prefs.edit().putString(key(id),json).putString("meta:$id",JSONObject().put("etag",etag).put("dirty",false).put("snapshot",json).toString()).commit()
    }
    companion object { private val LOCK=Any() }
}
