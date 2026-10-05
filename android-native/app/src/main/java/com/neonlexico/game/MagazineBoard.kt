package com.neonlexico.game

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun NativeMagazineBoard(session: Session, selected: PuzzleWord, cursor: Int, selectWord: (String,String?) -> Unit) {
    var size by rememberSaveable(session.puzzle.id) { mutableIntStateOf(88) }
    val cursorKey=if(session.completed) null else Engine.wordCells(selected).getOrNull(cursor)?.key
    val cursorView=rememberGridCursor(cursorKey,size to session.hints)
    val letters=session.puzzle.words.flatMap(Engine::wordCells).map { it.key }.toSet()
    val active=Engine.wordCells(selected).map { it.key }.toSet()
    val clues=session.puzzle.words.groupBy { Engine.clueCell(it).key }
    val line=Color(0xFF79654D);val paper=Color(0xFFFFFDF7);val cluePaper=Color(0xFFE9E5DC);val selectedPaper=Color(0xFFFCEAC3);val ink=Color(0xFF302A23)
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically) {
            val fill=Engine.gridFill(session)
            Text("${fill.filled}/${fill.total} CASAS PREENCHIDAS",fontSize=9.sp,color=Color(0xFFB5A3C1),modifier=Modifier.weight(1f))
            IconButton(onClick={size=(size-20).coerceAtLeast(68)},modifier=Modifier.semantics { contentDescription="Diminuir grade" }) { Text("−",fontSize=24.sp,color=Color(0xFFF5BD70)) }
            IconButton(onClick={size=(size+20).coerceAtMost(128)},modifier=Modifier.semantics { contentDescription="Ampliar grade" }) { Text("+",fontSize=24.sp,color=Color(0xFFF5BD70)) }
        }
        Column(Modifier.heightIn(max=310.dp).verticalScroll(rememberScrollState()).horizontalScroll(rememberScrollState()).background(line).padding(1.dp)) {
            repeat(session.puzzle.rows) { row ->
                Row {
                    repeat(session.puzzle.cols) { col ->
                        val key="$row:$col";val entries=clues[key]
                        when {
                            entries!=null -> Column(Modifier.size(size.dp).background(cluePaper).border(.5.dp,line)) {
                                entries.forEach { word ->
                                    val textSize=if(word.clue.length>95||entries.size>1) 9.sp else 11.sp
                                    Row(Modifier.weight(1f).fillMaxWidth().background(if(word.id==selected.id) Color(0xFFF5D39A) else cluePaper).border(.5.dp,line).clickable { selectWord(word.id,null) }.semantics { contentDescription="Pista ${word.number} ${if(word.direction=="across") "horizontal" else "vertical"}: ${word.clue}" }.padding(3.dp),verticalAlignment=Alignment.CenterVertically) {
                                        Text(word.clue,color=ink,fontSize=textSize,lineHeight=textSize*1.1,textAlign=TextAlign.Center,modifier=Modifier.weight(1f))
                                        Text(if(word.direction=="across") "→" else "↓",color=ink,fontSize=13.sp,modifier=Modifier.align(Alignment.Bottom))
                                    }
                                }
                            }
                            key in letters -> Box(Modifier.size(size.dp).then(if(key==cursorKey) Modifier.bringIntoViewRequester(cursorView) else Modifier).background(if(key in active) selectedPaper else paper).border(if(key==cursorKey) 3.dp else .5.dp,if(key in active) Color(0xFFBA7925) else line).clickable {
                                val owners=session.puzzle.words.filter { word -> Engine.wordCells(word).any { it.key==key } }
                                val next=if(selected in owners&&owners.size>1) owners.first { it.id!=selected.id } else owners.first()
                                selectWord(next.id,key)
                            }.semantics { contentDescription="casa $row,$col, ${session.values[key]?:"vazia"}" },contentAlignment=Alignment.Center) {
                                Text(session.values[key]?:"",fontSize=(size*.38).sp,fontWeight=FontWeight.Bold,color=ink)
                            }
                            else -> Spacer(Modifier.size(size.dp).background(Color(0xFFC8C1B4)).border(.5.dp,line))
                        }
                    }
                }
            }
        }
    }
}
