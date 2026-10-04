package com.neonlexico.game

import android.app.Application
import android.content.Context
import androidx.test.core.app.ApplicationProvider
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.net.HttpURLConnection
import java.net.URL

@RunWith(RobolectricTestRunner::class)
@Config(sdk=[35])
class CloudSyncTest {
    private lateinit var app: Application
    private lateinit var repository: GameRepository
    private fun webSave(): SaveData = SaveCodec.decode(JSONObject(javaClass.classLoader!!.getResourceAsStream("native-fixtures.json")!!.bufferedReader(Charsets.UTF_8).use { it.readText() }).getJSONObject("save").toString())
    @Before fun configure() { app=ApplicationProvider.getApplicationContext();app.getSharedPreferences("neon-lexico",Context.MODE_PRIVATE).edit().clear().commit();repository=GameRepository(app) }
    private class Server: AutoCloseable {
        val http=MockWebServer()
        val saves=mutableMapOf<String,Pair<String,String>>()
        var counter=0
        var beforeGet: (() -> Unit)?=null
        val url: String get()=http.url("/").toString().trimEnd('/')
        fun update(id: String,save: SaveData) { saves[id]=SaveCodec.encode(save) to (++counter).toString() }
        init {
            http.dispatcher=object: Dispatcher() { override fun dispatch(request: RecordedRequest): MockResponse {
                val id=request.path.orEmpty().substringAfterLast('/')
                var status=200;var response=JSONObject()
                if(request.getHeader("Authorization")?.matches(Regex("Bearer [a-f0-9]{32}"))!=true) status=401
                else if(id=="family") response.put("profiles",org.json.JSONArray().put("daniel").put("larissa"))
                else if(request.method=="GET") {
                    beforeGet?.also { beforeGet=null;it() }
                    val value=saves[id]
                    if(value==null) status=404 else response.put("save",JSONObject(value.first)).put("etag",value.second)
                } else if(request.method=="PUT") {
                    val value=saves[id];val matches=request.getHeader("If-Match")?.trim('"')==value?.second
                    val creates=request.getHeader("If-None-Match")=="*"&&value==null
                    if(!creates&&!matches) status=409 else {
                        val save=SaveCodec.decode(request.body.readUtf8());update(id,save);response.put("etag",saves.getValue(id).second)
                    }
                } else status=405
                return MockResponse().setResponseCode(status).setHeader("Content-Type","application/json").setBody(response.toString())
            } };http.start()
        }
        override fun close() { http.shutdown() }
    }
    @Test fun conflictChoiceCannotOverwriteAnUnreviewedNewerVersion() {
        Server().use { server ->
            val cloud=CloudSync(repository,server.url);cloud.connect(cloud.newCode(),true)
            val save=webSave();repository.save("daniel",save);assertEquals("saved",cloud.sync("daniel").kind)
            server.update("daniel",save.copy(seed="remote-two"));repository.save("daniel",save.copy(settings=Settings(sound=true)))
            assertEquals("conflict",cloud.sync("daniel").kind);assertEquals("remote-two",SaveCodec.decode(server.saves.getValue("daniel").first).seed)
            server.update("daniel",save.copy(seed="remote-three"))
            assertEquals("conflict",cloud.sync("daniel","local").kind);assertEquals("remote-three",SaveCodec.decode(server.saves.getValue("daniel").first).seed)
            assertEquals("loaded",cloud.sync("daniel","cloud").kind);assertEquals("remote-three",repository.load("daniel").seed)
            assertTrue(app.getSharedPreferences("neon-lexico",Context.MODE_PRIVATE).all.keys.any { it.startsWith("backup:daniel:") })
            assertTrue(repository.load("larissa").sessions.isEmpty())
        }
    }
    @Test fun localChangesDuringFetchArePreservedAndWaitForNextSync() {
        Server().use { server ->
            val cloud=CloudSync(repository,server.url);cloud.connect(cloud.newCode(),true);server.update("daniel",webSave())
            val changed=repository.load("daniel").copy(settings=Settings(sound=false))
            server.beforeGet={ repository.save("daniel",changed) }
            assertEquals("pending",cloud.sync("daniel").kind);assertEquals(changed,repository.load("daniel"));assertEquals(webSave(),SaveCodec.decode(server.saves.getValue("daniel").first))
        }
    }
    @Test fun offlineFailureRetainsProgressAndCode() {
        repository.connectCode("a".repeat(32));val save=webSave();repository.save("daniel",save)
        val cloud=CloudSync(repository,"http://127.0.0.1:1")
        assertEquals("offline",cloud.sync("daniel").kind);assertEquals(save,repository.load("daniel"));assertEquals("a".repeat(32),repository.syncCode())
    }
    @Test fun sameSharedCodeKeepsDanielAndLarissaSeparate() {
        Server().use { server ->
            val cloud=CloudSync(repository,server.url);cloud.connect(cloud.newCode(),true)
            repository.save("daniel",webSave());assertEquals("saved",cloud.sync("daniel").kind)
            assertEquals("saved",cloud.sync("larissa").kind)
            assertEquals(webSave(),SaveCodec.decode(server.saves.getValue("daniel").first));assertTrue(SaveCodec.decode(server.saves.getValue("larissa").first).sessions.isEmpty())
        }
    }
    @Test fun partialTypedDraftUsesTheSameCloudCellsAsTheBrowser() {
        Server().use { server ->
            val cloud=CloudSync(repository,server.url);cloud.connect(cloud.newCode(),true)
            val source=webSave();val session=source.sessions.getValue("classic:1")
            val word=session.puzzle.words.first { it.id !in session.solved }
            val cell=Engine.wordCells(word).first { it.key !in session.revealed }
            val next=source.copy(sessions=source.sessions+("classic:1" to session.copy(values=session.values+(cell.key to "Z"))))
            repository.save("daniel",next);assertEquals("saved",cloud.sync("daniel").kind)
            assertEquals("Z",SaveCodec.decode(server.saves.getValue("daniel").first).sessions.getValue("classic:1").values[cell.key])
            val prefs=app.getSharedPreferences("neon-lexico",Context.MODE_PRIVATE);val code=repository.syncCode();prefs.edit().clear().commit()
            val second=GameRepository(app);val connected=CloudSync(second,server.url);connected.connect(code,false)
            assertEquals("loaded",connected.sync("daniel").kind);assertEquals(next,second.load("daniel"));assertTrue(second.load("larissa").sessions.isEmpty())
        }
    }
    @Test fun liveBackendAcceptsWebFixtureThenNativeContinuation() {
        assumeTrue("Enable only for explicit live backend verification",System.getenv("NEON_LIVE_SYNC")=="1")
        val cloud=CloudSync(repository);val code=cloud.newCode();cloud.connect(code,true)
        val api="https://lexicon-laboratorio.nexcoreadm.chatgpt.site/api/neon/profiles/daniel"
        val source=webSave()
        val put=URL(api).openConnection() as HttpURLConnection
        try {
            put.connectTimeout=12000;put.readTimeout=12000;put.requestMethod="PUT";put.setRequestProperty("Authorization","Bearer $code");put.setRequestProperty("Content-Type","application/json");put.setRequestProperty("If-None-Match","*");put.doOutput=true
            put.outputStream.use { it.write(SaveCodec.encode(source).toByteArray(Charsets.UTF_8)) };assertEquals(200,put.responseCode)
        } finally { put.disconnect() }
        assertEquals("loaded",cloud.sync("daniel").kind);assertEquals(source,repository.load("daniel"))
        val session=source.sessions.getValue("cascade:1");val word=session.puzzle.words.first { it.id !in session.solved }
        val continued=Engine.submitWord(Engine.useHint(session,word.id),word.id,word.answer).session
        val next=Engine.recordCompletion(source,continued);assertTrue(repository.save("daniel",next));assertEquals("saved",cloud.sync("daniel").kind)
        val get=URL(api).openConnection() as HttpURLConnection
        try { get.connectTimeout=12000;get.readTimeout=12000;get.setRequestProperty("Authorization","Bearer $code");assertEquals(200,get.responseCode);val wire=JSONObject(get.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() });assertEquals(next,SaveCodec.decode(wire.getJSONObject("save").toString())) } finally { get.disconnect() }
        assertTrue(repository.load("larissa").sessions.isEmpty())
        System.getenv("NEON_SYNC_PROOF_PATH")?.takeIf { it.isNotEmpty() }?.let { path ->
            val proof=java.io.File(path);proof.parentFile?.mkdirs();proof.writeText(SaveCodec.encode(next),Charsets.UTF_8)
        }
    }
}
