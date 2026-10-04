package com.neonlexico.game

import org.json.JSONArray
import org.json.JSONObject

/** Browser-compatible, bounded JSON. Remote data is validated before replacing local data. */
object SaveCodec {
    const val MAX_BYTES = 8_000_000
    private fun keys(obj: JSONObject, expected: Set<String>) { require(obj.keys().asSequence().toSet()==expected) { "Campos do progresso inválidos." } }
    private fun text(obj: JSONObject,key: String,max: Int=200): String { val value=obj.get(key);require(value is String && value.isNotEmpty() && value.length<=max && value.none { it.code<32||it.code==127 });return value }
    private fun identifier(obj: JSONObject,key: String,max: Int=120): String { val value=text(obj,key,max);require(value.matches(Regex("[a-zA-Z0-9_:-]+")));return value }
    private fun integer(obj: JSONObject,key: String,min: Int,max: Int,whole: Boolean=true): Int { val value=obj.get(key);require(value is Number);val n=value.toDouble();require(n.isFinite()&&n>=min&&n<=max&&(!whole||n%1==0.0));return n.toInt() }
    private fun bool(obj: JSONObject,key: String): Boolean { val value=obj.get(key);require(value is Boolean);return value }
    private fun strings(array: JSONArray,max: Int): List<String> { require(array.length()<=max);val values=(0 until array.length()).map { val value=array.get(it);require(value is String&&value.length in 1..120&&value.matches(Regex("[a-zA-Z0-9_:-]+")));value };require(values.distinct().size==values.size);return values }
    fun catalog(json: String): List<Theme> {
        val themes=JSONObject(json).getJSONArray("themes")
        return (0 until themes.length()).map { index -> val t=themes.getJSONObject(index);val entries=t.getJSONArray("entries"); Theme(t.getString("id"),t.getString("name"),t.getString("icon"),t.getString("description"),(0 until entries.length()).map { i -> val e=entries.getJSONObject(i); Entry(e.getString("id"),e.getString("answer"),e.getString("clue"),e.getInt("difficulty")) }) }
    }
    fun puzzleJson(p: Puzzle): JSONObject = JSONObject().put("id",p.id).put("mode",p.mode.wire).put("level",p.level).put("themeIds",JSONArray(p.themeIds)).put("words",JSONArray(p.words.map { w -> JSONObject().put("id",w.id).put("answer",w.answer).put("clue",w.clue).put("difficulty",w.difficulty).put("themeId",w.themeId).put("themeName",w.themeName).put("row",w.row).put("col",w.col).put("direction",w.direction).put("number",w.number) })).put("rows",p.rows).put("cols",p.cols).put("difficulty",p.difficulty)
    private fun puzzle(obj: JSONObject): Puzzle {
        keys(obj,setOf("id","mode","level","themeIds","words","rows","cols","difficulty"))
        val mode=Mode.fromWire(obj.getString("mode"));val level=integer(obj,"level",1,100);val themes=strings(obj.getJSONArray("themeIds"),5);require(themes.size==5)
        val rows=integer(obj,"rows",1,64);val cols=integer(obj,"cols",1,64);val array=obj.getJSONArray("words");require(array.length() in 1..40)
        val words=(0 until array.length()).map { i ->
            val w=array.getJSONObject(i);keys(w,setOf("id","answer","clue","difficulty","themeId","themeName","row","col","direction","number"))
            val answer=text(w,"answer",40);require(answer.matches(Regex("[A-Z]+")));val themeId=identifier(w,"themeId");require(themeId in themes)
            val row=integer(w,"row",0,rows-1);val col=integer(w,"col",0,cols-1);val direction=w.getString("direction");require(direction in listOf("across","down"));require((if(direction=="across") col else row)+answer.length<=(if(direction=="across") cols else rows))
            PuzzleWord(identifier(w,"id"),answer,text(w,"clue",600),integer(w,"difficulty",1,3),themeId,text(w,"themeName",100),row,col,direction,integer(w,"number",1,100))
        }
        require(words.map { it.id }.distinct().size==words.size)
        val p=Puzzle(text(obj,"id",700),mode,level,themes,words,rows,cols,text(obj,"difficulty",60));solution(p);return p
    }
    private fun solution(puzzle: Puzzle): Map<String,String> { val cells=mutableMapOf<String,String>();puzzle.words.forEach { w -> Engine.wordCells(w).forEachIndexed { i,c -> val letter=w.answer[i].toString();require(cells[c.key]==null||cells[c.key]==letter);cells[c.key]=letter } };return cells }
    private fun letters(obj: JSONObject,solution: Map<String,String>,revealed: Boolean): Map<String,String> {
        require(obj.length()<=solution.size)
        return obj.keys().asSequence().associateWith { key -> val letter=obj.get(key);require(solution.containsKey(key)&&letter is String&&letter.matches(Regex("[A-Z]"))&&(!revealed||solution[key]==letter));letter as String }
    }
    private fun session(obj: JSONObject): Session {
        keys(obj,setOf("puzzle","values","solved","revealed","mistakes","hints","elapsed","completed"));val puzzle=puzzle(obj.getJSONObject("puzzle"));val solution=solution(puzzle)
        val solved=strings(obj.getJSONArray("solved"),puzzle.words.size);require(solved.all { id -> puzzle.words.any { it.id==id } })
        val completed=bool(obj,"completed");require(completed==(solved.size==puzzle.words.size))
        val values=letters(obj.getJSONObject("values"),solution,false);val revealed=letters(obj.getJSONObject("revealed"),solution,true)
        require(revealed.all { (key,value) -> values[key]==value })
        for(w in puzzle.words.filter { it.id in solved }) Engine.wordCells(w).forEachIndexed { i,c -> require(values[c.key]==w.answer[i].toString()&&revealed[c.key]==w.answer[i].toString()) }
        return Session(puzzle,values,solved,revealed,integer(obj,"mistakes",0,1_000_000),integer(obj,"hints",0,1_000_000),integer(obj,"elapsed",0,1_000_000_000,false),completed)
    }
    fun decode(json: String): SaveData {
        require(json.toByteArray(Charsets.UTF_8).size<=MAX_BYTES)
        val obj=JSONObject(json);keys(obj,setOf("version","seed","results","sessions","settings"));require(integer(obj,"version",1,1)==1)
        val seed=text(obj,"seed",128);val resultsObj=obj.getJSONObject("results");keys(resultsObj,Mode.entries.map { it.wire }.toSet())
        val results=Mode.entries.associateWith { mode ->
            val data=resultsObj.getJSONObject(mode.wire);require(data.length()<=100)
            data.keys().asSequence().associateWith { level -> require(level.matches(Regex("(?:[1-9]\\d?|100)")));val r=data.getJSONObject(level);keys(r,setOf("stars","score","seconds"));LevelResult(integer(r,"stars",0,3),integer(r,"score",0,10_000_000),integer(r,"seconds",0,1_000_000_000,false)) }
        }
        val sessionsObj=obj.getJSONObject("sessions");require(sessionsObj.length()<=200)
        val sessions=sessionsObj.keys().asSequence().associateWith { key -> require(key.matches(Regex("(classic|cascade):(?:[1-9]\\d?|100)")));val s=session(sessionsObj.getJSONObject(key));require(key=="${s.puzzle.mode.wire}:${s.puzzle.level}");s }
        val settings=obj.getJSONObject("settings");keys(settings,setOf("sound","reducedMotion"))
        return SaveData(seed,results,sessions,Settings(bool(settings,"sound"),bool(settings,"reducedMotion")))
    }
    fun encode(save: SaveData): String {
        val results=JSONObject();Mode.entries.forEach { mode -> results.put(mode.wire,JSONObject().apply { save.results.getValue(mode).forEach { (level,r) -> put(level,JSONObject().put("stars",r.stars).put("score",r.score).put("seconds",r.seconds)) } }) }
        val sessions=JSONObject();save.sessions.forEach { (key,s) -> sessions.put(key,JSONObject().put("puzzle",puzzleJson(s.puzzle)).put("values",JSONObject(s.values)).put("solved",JSONArray(s.solved)).put("revealed",JSONObject(s.revealed)).put("mistakes",s.mistakes).put("hints",s.hints).put("elapsed",s.elapsed).put("completed",s.completed)) }
        return canonical(JSONObject().put("version",1).put("seed",save.seed).put("results",results).put("sessions",sessions).put("settings",JSONObject().put("sound",save.settings.sound).put("reducedMotion",save.settings.reducedMotion)))
    }
    fun canonical(value: Any?): String = when(value) { is JSONObject -> value.keys().asSequence().sorted().joinToString(",","{","}") { "${JSONObject.quote(it)}:${canonical(value.get(it))}" };is JSONArray -> (0 until value.length()).joinToString(",","[","]") { canonical(value.get(it)) }; is String -> JSONObject.quote(value);null,JSONObject.NULL -> "null";else -> value.toString() }
    fun meaningful(save: SaveData)=save.results.values.any { it.isNotEmpty() }||save.sessions.isNotEmpty()||!save.settings.sound||save.settings.reducedMotion
}
