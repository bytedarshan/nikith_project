// Self-contained vector scenes. These are starter illustrations; the admin can upload custom PNG/JPG/WebP puzzles.
function svg(scene,variant,body){
 const id=`g${scene}${Math.abs(variant%99)}`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 330" preserveAspectRatio="xMidYMid meet" aria-hidden="true" class="scene-svg">
 <defs>
 <filter id="${id}shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="5" stdDeviation="3" flood-color="#283844" flood-opacity=".12"/></filter>
 <pattern id="${id}grain" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r=".7" fill="#142C2B" opacity=".045"/><circle cx="19" cy="16" r=".6" fill="#142C2B" opacity=".04"/></pattern>
 </defs>${body}<rect width="480" height="330" fill="url(#${id}grain)" pointer-events="none"/></svg>`;
}
const tree=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="9" rx="28" ry="13" fill="#295C43" opacity=".14"/><circle cy="-8" r="26" fill="#3C8A69"/><circle cx="-11" cy="-15" r="17" fill="#61AA7D"/><circle cx="12" cy="-18" r="17" fill="#71BA84"/><circle cx="-8" cy="-21" r="5" fill="#AAD8A1" opacity=".7"/></g>`;
const bench=(x,y,rotation=0)=>`<g transform="translate(${x} ${y}) rotate(${rotation})"><rect x="-23" y="-9" width="46" height="18" rx="5" fill="#C38B56" stroke="#865B36" stroke-width="2"/><path d="M-17 -4h34 M-17 3h34" stroke="#E7B47C" stroke-width="2"/><rect x="-18" y="9" width="5" height="7" rx="2" fill="#865B36"/><rect x="13" y="9" width="5" height="7" rx="2" fill="#865B36"/></g>`;
const flowers=(x,y)=>`<g transform="translate(${x},${y})"><circle cx="0" cy="0" r="7" fill="#ECA2A0"/><circle cx="9" cy="-8" r="6" fill="#FFF4AA"/><circle cx="-9" cy="-3" r="5" fill="#FFF2A2"/><circle cx="7" cy="9" r="5" fill="#ECB1B6"/></g>`;
function park(v){const shift=v%3*8;return svg('park',v,`
 <rect width="480" height="330" fill="#B5D5A6"/>
 <path d="M-50 158 Q108 110 242 170 T520 132" stroke="#EEE3BE" stroke-width="48" fill="none"/>
 <path d="M245 -40 Q206 105 246 163 T210 370" stroke="#F1E7C7" stroke-width="44" fill="none"/>
 <path d="M-30 158 Q108 110 242 170 T520 132" stroke="#FFF6D8" stroke-width="3" stroke-dasharray="3 16" fill="none" opacity=".75"/>
 <rect x="32" y="29" width="91" height="69" rx="12" fill="#EFAE91" filter="url(#gpark${v%99}shadow)"/><rect x="45" y="43" width="64" height="43" rx="6" fill="#FCE8CE"/><path d="M23 28L79 -5L133 28Z" fill="#BD665E"/><rect x="69" y="64" width="20" height="22" rx="3" fill="#B9C5B0"/>
 ${tree(376,56,1.22)} ${tree(425,277,1.15)} ${tree(54,269,1.2)} ${tree(132,286,.65)}
 <circle cx="242" cy="164" r="51" fill="#F2E4C1" stroke="#D2C096" stroke-width="4"/><circle cx="242" cy="164" r="40" fill="#8BC8CE" stroke="#4D98A4" stroke-width="6"/><circle cx="242" cy="164" r="19" fill="#BEE6E5"/><circle cx="242" cy="164" r="8" fill="#F0FAE9"/><path d="M242 136v-24M242 136l-11 -11M242 136l11 -11" stroke="#F0FAE9" stroke-width="4" stroke-linecap="round"/>
 <path d="M350 194l51 -20 40 26 -49 19Z" fill="#F3C47C" stroke="#9D7655" stroke-width="3"/><path d="M371 186v-41M419 184v-40" stroke="#936C49" stroke-width="6"/><path d="M344 146L395 113L442 142L397 166Z" fill="#E47E66"/>
 ${bench(121,150,-16)} ${bench(299,265,22)} ${flowers(152,42)} ${flowers(444,134)}
 <text x="81" y="111" font-size="11" font-weight="800" letter-spacing="2" text-anchor="middle" fill="#6D5E46">CAFÉ</text>
 <text x="241" y="224" font-size="10" font-weight="800" letter-spacing="1" text-anchor="middle" fill="#597865">FOUNTAIN</text>`)}
function cafe(v){return svg('cafe',v,`
 <rect width="480" height="330" fill="#E6BEAA"/><path d="M25 60h430v240H25Z" fill="#F7E6CC"/>
 <path d="M25 60H455V90H25Z" fill="#C98373"/><path d="M25 290h430v13H25Z" fill="#C58F79"/>
 <g stroke="#E7D7C0" stroke-width="1.4">${[60,110,160,210,260].map(y=>`<path d="M27 ${y}H453"/>`).join('')}${[100,175,250,325,400].map(x=>`<path d="M${x} 91V291"/>`).join('')}</g>
 <rect x="48" y="35" width="138" height="95" rx="10" fill="#95C2BF" stroke="#F9EFDF" stroke-width="11"/><path d="M115 42v83" stroke="#F9EFDF" stroke-width="7"/><path d="M54 81h127" stroke="#F9EFDF" stroke-width="6"/>
 <rect x="278" y="43" width="156" height="55" rx="12" fill="#C07B5F" filter="url(#gcafe${v%99}shadow)"/><path d="M288 61h134" stroke="#F0B38D" stroke-width="6"/><g fill="#F8E2BA"><circle cx="311" cy="80" r="9"/><circle cx="349" cy="80" r="9"/><circle cx="390" cy="80" r="9"/></g><text x="359" y="32" text-anchor="middle" font-size="12" font-weight="900" fill="#89574E" letter-spacing="2">COFFEE BAR</text>
 <g filter="url(#gcafe${v%99}shadow)"><circle cx="115" cy="216" r="49" fill="#A86E5A"/><circle cx="115" cy="216" r="41" fill="#D99E7F"/><circle cx="118" cy="213" r="9" fill="#F8E9D4"/><circle cx="110" cy="223" r="5" fill="#FFF9ED"/></g>
 <g fill="#739A8B"><rect x="75" y="150" width="34" height="26" rx="10"/><rect x="114" y="270" width="34" height="26" rx="10"/><rect x="61" y="213" width="27" height="34" rx="10"/><rect x="147" y="202" width="27" height="34" rx="10"/></g>
 <g filter="url(#gcafe${v%99}shadow)"><rect x="299" y="181" width="103" height="74" rx="18" fill="#C57A6F"/><rect x="314" y="187" width="76" height="45" rx="10" fill="#D99F89"/><rect x="315" y="239" width="75" height="18" rx="6" fill="#D5AA8E"/></g>
 <g><circle cx="275" cy="231" r="24" fill="#A56C53"/><circle cx="275" cy="231" r="19" fill="#F5D4AD"/><circle cx="272" cy="227" r="7" fill="#9D6B52"/></g>
 <g><rect x="224" y="102" width="42" height="39" rx="7" fill="#C07C62"/><circle cx="245" cy="105" r="27" fill="#6DA38B"/><circle cx="229" cy="90" r="17" fill="#8CC5A3"/><circle cx="262" cy="89" r="14" fill="#8BBF98"/></g>
 <g fill="#9C6B57"><rect x="393" y="122" width="34" height="20" rx="8"/><rect x="340" y="122" width="34" height="20" rx="8"/></g>
 <text x="114" y="312" font-size="11" font-weight="800" text-anchor="middle" letter-spacing="1.5" fill="#986A55">WINDOW SEAT</text>`)}
function island(v){return svg('island',v,`
 <rect width="480" height="330" fill="#87CDD3"/><g stroke="#B6E8E8" fill="none" stroke-width="3" opacity=".7"><path d="M-30 29Q33 15 81 35T205 34T355 18T510 42"/><path d="M-30 286Q33 271 81 294T205 292T355 279T510 298"/><path d="M23 166Q55 155 88 176"/><path d="M370 152q42 -10 76 13"/></g>
 <path d="M122 56Q197 14 289 48Q385 71 402 147Q412 243 333 281Q230 317 136 259Q67 217 82 137Q84 86 122 56Z" fill="#FBE2AE" stroke="#E9C991" stroke-width="8"/>
 <path d="M144 79Q215 45 279 71Q352 91 362 149Q370 215 311 245Q235 272 164 234Q114 209 112 151Q109 108 144 79Z" fill="#A7C988"/>
 <path d="M172 239Q239 200 291 164T349 87" fill="none" stroke="#F7E7B6" stroke-width="20" stroke-linecap="round"/>
 <path d="M115 167Q177 158 196 110" fill="none" stroke="#EFE2B5" stroke-width="9" stroke-linecap="round"/>
 <path d="M284 188l-18 -36 18 -26 23 30Z" fill="#748C83"/><path d="M268 166l18 -17 21 12" stroke="#BEC5A8" stroke-width="5" fill="none"/>
 ${tree(182,108,.69)} ${tree(155,185,.78)} ${tree(321,222,.74)}
 <g transform="translate(342 97)"><rect x="-16" y="-7" width="32" height="67" fill="#F4EFE2" stroke="#A7735E" stroke-width="3"/><rect x="-17" y="10" width="34" height="15" fill="#CD7363"/><path d="M-21 -7L0 -34L21 -7Z" fill="#CB645E"/><circle cy="-7" r="6" fill="#F6D678"/><path d="M-37 63h74" stroke="#A7735E" stroke-width="7"/></g>
 <path d="M82 192L33 207L22 239L104 220Z" fill="#A68157"/><path d="M23 234l80 -18" stroke="#F9F1DB" stroke-width="3"/>
 <g transform="translate(53 244)"><path d="M-20 -2h55l-12 17h-30Z" fill="#FFF4E4"/><path d="M7 -36v34" stroke="#776451" stroke-width="3"/><path d="M10 -34l27 26H10Z" fill="#E58F7A"/></g>
 <circle cx="260" cy="90" r="13" fill="#E9AB5D"/><circle cx="260" cy="90" r="5" fill="#FCE7B9"/>
 <text x="224" y="299" font-size="12" font-weight="800" text-anchor="middle" letter-spacing="3" fill="#4B8A8D">MYSTERY ISLAND</text>`)}
function gallery(v){return svg('gallery',v,`
 <rect width="480" height="330" fill="#E7D9CB"/><rect y="25" width="480" height="226" fill="#FFF5E5"/><path d="M0 255L480 255L480 330H0Z" fill="#E9C6A7"/><path d="M0 255H480" stroke="#CDAA89" stroke-width="6"/>
 <g stroke="#DDC3AC" stroke-width="1">${Array.from({length:10},(_,i)=>`<path d="M${i*53} 255l-40 75"/>`).join('')}</g>
 <rect x="39" y="63" width="119" height="133" rx="3" fill="#B78553"/><rect x="49" y="72" width="99" height="115" fill="#F0D3A9"/><circle cx="99" cy="126" r="32" fill="#B66D67"/><path d="M66 168L90 121L116 145L139 98V178H57Z" fill="#789B9B"/><circle cx="122" cy="94" r="11" fill="#F9E9AD"/>
 <rect x="190" y="51" width="104" height="126" rx="3" fill="#B98C64"/><rect x="199" y="60" width="86" height="107" fill="#A5BBAB"/><path d="M204 158L238 78L277 159Z" fill="#EAA78B"/><circle cx="238" cy="88" r="17" fill="#F8E6BF"/><path d="M218 154L262 92" stroke="#567D7A" stroke-width="7"/>
 <rect x="328" y="79" width="112" height="106" rx="3" fill="#B28760"/><rect x="337" y="87" width="94" height="90" fill="#CCB9C5"/><circle cx="384" cy="132" r="33" fill="#D9AE79"/><path d="M363 133l20 -30 22 42" stroke="#9F6668" stroke-width="12" fill="none" stroke-linecap="round"/>
 <g filter="url(#ggallery${v%99}shadow)"><path d="M215 294h65v-63h-65Z" fill="#F1E5D6"/><path d="M227 224l19 -36 19 37-8 10h-21Z" fill="#83A9A7"/><circle cx="246" cy="185" r="16" fill="#83A9A7"/><path d="M235 234h21" stroke="#547F7F" stroke-width="4"/></g>
 <g><circle cx="71" cy="270" r="18" fill="#6C9878"/><circle cx="56" cy="263" r="17" fill="#87B190"/><rect x="58" y="275" width="24" height="29" rx="4" fill="#C98467"/></g>
 <text x="238" y="313" text-anchor="middle" font-size="11" font-weight="800" fill="#AE765D" letter-spacing="3">THE LITTLE GALLERY</text>`)}
function plaza(v){return svg('plaza',v,`
 <rect width="480" height="330" fill="#D3C1AA"/><rect width="480" height="330" fill="#F4E6CB"/>
 ${[48,100,152,204,256,308].map(y=>`<path d="M0 ${y}h480" stroke="#E4D0B4" stroke-width="2"/>`).join('')}${[40,100,160,220,280,340,400,460].map(x=>`<path d="M${x} 0v330" stroke="#E4D0B4" stroke-width="2"/>`).join('')}
 <rect x="22" y="12" width="118" height="97" rx="8" fill="#C47D6E"/><rect x="37" y="28" width="90" height="69" rx="6" fill="#F0C99C"/><path d="M12 11L78 -9L151 11Z" fill="#A75B62"/><g fill="#648F8B"><rect x="53" y="43" width="22" height="30" rx="4"/><rect x="91" y="43" width="22" height="30" rx="4"/></g>
 <rect x="340" y="22" width="116" height="105" rx="7" fill="#9BB8AB"/><rect x="355" y="36" width="86" height="79" fill="#D4E6C4"/><path d="M326 22L397 -9L468 22Z" fill="#5F8D80"/><circle cx="397" cy="68" r="21" fill="#F9EDCF"/><path d="M397 54v14l10 7" stroke="#7D9B92" stroke-width="4" stroke-linecap="round"/>
 <circle cx="237" cy="157" r="69" fill="#D9C3A4"/><circle cx="237" cy="157" r="54" fill="#E6D4B8" stroke="#CDAE87" stroke-width="4"/>
 <rect x="226" y="125" width="22" height="54" rx="7" fill="#8CA5A1"/><circle cx="237" cy="112" r="20" fill="#658E87"/><rect x="218" y="170" width="39" height="18" rx="3" fill="#B78566"/>
 <g transform="translate(76 238)"><rect x="-42" y="-20" width="84" height="47" rx="6" fill="#EBAE82"/><path d="M-50 -20L-35 -47H35L50 -20Z" fill="#C77A69"/><path d="M-30 -47L-20 -20M0 -47v27M30 -47L20 -20" stroke="#FADEBE" stroke-width="11"/><rect x="-20" y="-5" width="40" height="21" rx="4" fill="#F7E4B6"/></g>
 ${tree(380,248,.98)} ${tree(436,189,.65)} ${bench(298,269,-30)}
 <text x="237" y="229" text-anchor="middle" font-size="11" font-weight="900" fill="#9E866D" letter-spacing="2">TOWN SQUARE</text>`)}
function patterns(v){const flip=v%2===0?1:-1;return svg('patterns',v,`
 <rect width="480" height="330" fill="#E8EBE2"/><path d="M0 165H480M240 0V330" stroke="#D5DCD1" stroke-width="2" stroke-dasharray="7 10"/>
 <circle cx="96" cy="99" r="58" fill="#DF856F"/><circle cx="96" cy="99" r="34" fill="#F4D8B4"/><circle cx="96" cy="99" r="14" fill="#DF856F"/>
 <g transform="translate(282 59)"><path d="M60 0L118 103H2Z" fill="#5A948D"/><path d="M60 29L91 84H29Z" fill="#C7E0C4"/></g>
 <rect x="76" y="212" width="112" height="90" rx="21" fill="#A8AED4" transform="rotate(-10 132 257)"/><rect x="105" y="229" width="52" height="50" rx="11" fill="#D5D6E9" transform="rotate(-10 132 257)"/>
 <g transform="translate(334 255)"><path d="M0 -64l17 41 46 2-34 30 11 46L0 32l-40 23 11 -46-34 -30 46 -2Z" fill="#E7B05B"/><circle r="13" fill="#FFF0C0"/></g>
 <circle cx="227" cy="165" r="15" fill="#475F69"/><circle cx="227" cy="165" r="5" fill="#FFF8E7"/>
 <g fill="#6E7A7B" opacity=".55"><circle cx="420" cy="50" r="5"/><circle cx="49" cy="185" r="7"/><circle cx="257" cy="290" r="6"/></g>
 <path d="M30 30h420v270H30Z" fill="none" stroke="#ABB9AA" stroke-width="2" rx="12"/>`)}
function station(v){return svg('station',v,`
 <rect width="480" height="330" fill="#DCE5DB"/><rect y="191" width="480" height="77" fill="#C0CCC5"/><path d="M0 202H480" stroke="#FFF0BA" stroke-width="10" stroke-dasharray="28 9"/>
 <path d="M0 273H480" stroke="#9FB0AD" stroke-width="5"/><path d="M0 307H480" stroke="#788F91" stroke-width="5"/>
 ${Array.from({length:9},(_,i)=>`<rect x="${i*61-18}" y="272" width="30" height="58" rx="2" fill="#A7BBB6"/>`).join('')}
 <rect x="28" y="34" width="134" height="111" rx="11" fill="#B6C9BC"/><rect x="39" y="45" width="112" height="88" rx="8" fill="#EAF1E1"/><g stroke="#85ACA6" stroke-width="7"><path d="M60 115V70H130" fill="none"/><path d="M102 57V130"/></g><rect x="44" y="53" width="101" height="8" rx="4" fill="#5F8886"/>
 <rect x="183" y="29" width="125" height="59" rx="11" fill="#648D8B"/><path d="M206 58h77" stroke="#E5F4E8" stroke-width="6" stroke-linecap="round"/><path d="M271 43l13 15-13 15" stroke="#E5F4E8" stroke-width="6" fill="none"/><text x="196" y="18" font-size="11" fill="#51736D" font-weight="900" letter-spacing="2">EXIT</text>
 <circle cx="394" cy="73" r="46" fill="#F9F7E7" stroke="#8CA9A3" stroke-width="9"/><path d="M394 45v29l17 12" stroke="#5A7775" stroke-width="7" fill="none" stroke-linecap="round"/>
 ${bench(119,163,0)} ${bench(344,167,0)}
 <g transform="translate(246 159)"><rect x="-32" y="-29" width="64" height="43" rx="10" fill="#E89D81"/><rect x="-24" y="-21" width="48" height="27" rx="5" fill="#FEEDD1"/><circle cx="-13" cy="-7" r="7" fill="#9ABEC5"/><circle cx="12" cy="-7" r="7" fill="#E0C08B"/></g>
 <path d="M0 202H480" stroke="#E8CB79" stroke-width="3"/>
 <text x="248" y="246" text-anchor="middle" font-size="13" fill="#698882" font-weight="900" letter-spacing="4">PLATFORM 02</text>`)}
function garden(v){return svg('garden',v,`
 <rect width="480" height="330" fill="#B1D0A9"/>
 <path d="M-30 288Q108 300 110 220T259 163T430 20" stroke="#F3E6C3" stroke-width="37" fill="none" stroke-linecap="round"/>
 <path d="M343 192C291 175 264 196 269 247C271 287 320 308 379 287C431 264 424 215 384 202Z" fill="#76B9BC" stroke="#539A9B" stroke-width="6"/>
 <path d="M310 199Q344 229 385 193" fill="none" stroke="#B68565" stroke-width="14"/><path d="M310 195Q344 225 385 189" fill="none" stroke="#F0C68F" stroke-width="8"/>
 <g transform="translate(107 100)"><path d="M-44 8L0 -25L44 8Z" fill="#D98C73"/><path d="M-40 9h80v45h-80Z" fill="#F3D3A0"/><rect x="-20" y="20" width="40" height="33" rx="7" fill="#7F9D85"/><path d="M-46 9h92" stroke="#A87358" stroke-width="6"/></g>
 ${tree(229,61,1.06)} ${tree(400,94,.92)} ${tree(77,244,.82)} ${tree(453,300,.9)}
 <circle cx="228" cy="175" r="22" fill="#EFE4D0" stroke="#D5BB99" stroke-width="4"/><circle cx="228" cy="166" r="14" fill="#B78875"/><path d="M213 183h30v13h-30Z" fill="#B78875"/>
 ${flowers(167,91)} ${flowers(405,172)} ${flowers(43,160)} ${bench(177,269,-26)}
 <g fill="#E2F3D9"><circle cx="340" cy="258" r="7"/><circle cx="357" cy="242" r="6"/><circle cx="374" cy="261" r="5"/></g>
 <text x="348" y="311" text-anchor="middle" font-size="11" font-weight="900" fill="#5C968F" letter-spacing="2">LILY POND</text>`)}
const scenes={park,cafe,island,gallery,plaza,patterns,station,garden};
export const SCENES=Object.keys(scenes);
export function sceneMarkup(name='park',variant=0){return (scenes[name]||park)(Number(variant)||0)}
export function createArtMarkup(puzzle){
 if(puzzle.imageUrl) return `<img class="scene-image" src="${puzzle.imageUrl}" alt="Puzzle illustration" draggable="false" />`;
 return sceneMarkup(puzzle.scene,puzzle.variant||0);
}
