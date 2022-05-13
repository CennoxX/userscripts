// ==UserScript==
// @name         Wikidata Episode Generator
// @version      0.9.3
// @description  Creates QuickStatements for Wikidata episode items from Wikipedia episode lists
// @author       CennoxX
// @namespace    https://greasyfork.org/users/21515
// @homepage     https://github.com/CennoxX/userscripts
// @supportURL   https://github.com/CennoxX/userscripts/issues/new?title=[Wikipedia%20Episode%20Generator]%20
// @match        https://en.wikipedia.org/wiki/*
// @connect      www.wikidata.org
// @connect      www.imdb.com
// @connect      www.fernsehserien.de
// @icon         https://www.google.com/s2/favicons?sz=64&domain=www.wikidata.org
// @grant        GM.xmlHttpRequest
// @grant        GM.setClipboard
// @grant        GM.registerMenuCommand
// @license      MIT
// ==/UserScript==
/* jshint esversion: 10 */
/* eslint quotes: ["warn", "double", {"avoidEscape": true}] */
/* eslint no-return-assign: "off" */
/* eslint curly: "off" */

(function() {
    "use strict";
    GM.registerMenuCommand("convert episode lists for Wikidata",
                           (async()=>{
        console.clear();
        var article = document.title.split(" – Wikipedia")[0];
        var response = await fetch(`/w/api.php?action=query&prop=revisions|pageprops&titles=${encodeURIComponent(article)}&rvslots=*&rvprop=content|ids&formatversion=2&format=json`);
        var data = await response.json();
        var version = Object.values(data.query.pages)[0].revisions[0];
        var articletext = version.slots.main.content;
        var subArticles = articletext.match(/{{:(.*)}}/g);
        if (subArticles != null){
            console.log("loading sub articles from Wikipedia…");
            for (var sub of subArticles){
                response = await fetch(`/w/api.php?action=query&prop=revisions|pageprops&titles=${encodeURIComponent(sub.replace(/{{:|}}/g,""))}&rvslots=*&rvprop=content|ids&formatversion=2&format=json`);
                var subData = await response.json();
                var subtext = Object.values(subData.query.pages)[0].revisions[0].slots.main.content;
                articletext = articletext.replace(sub, subtext);
            }
        }
        var wikibaseId = Object.values(data.query.pages)[0].pageprops.wikibase_item;
        response = await GM.xmlHttpRequest({
            method: "GET",
            url: `https://www.wikidata.org/w/api.php?action=wbgetentities&props=claims&sitefilter=dewiki&ids=${wikibaseId}&format=json`,
            onload: function(response) {
                return response;
            }
        });
        var jsonObj = Object.values((JSON.parse(response.responseText)).entities)[0];
        var seriesId = 0;
        if (article.split("List of ").length==2){
            seriesId = jsonObj.claims.P360[0].qualifiers.P179[0].datavalue.value.id;
        }else if(article.split("season").length==2){
            seriesId = jsonObj.claims.P179[0].mainsnak.datavalue.value.id;
        }else{
            seriesId = wikibaseId;
        }
        response = await GM.xmlHttpRequest({
            method: "GET",
            url: `https://www.wikidata.org/w/api.php?action=wbgetentities&props=sitelinks|claims|labels&sitefilter=dewiki&ids=${seriesId}&format=json`,
            onload: function(response) {
                return response;
            }
        });
        jsonObj = Object.values((JSON.parse(response.responseText)).entities)[0];
        var series = jsonObj.labels.de.value;
        var seriesEn = jsonObj.labels.en.value;
        var seriesNl = jsonObj.labels.nl?.value ?? jsonObj.labels.en.value;
        var networkId = jsonObj.claims.P449[0].mainsnak.datavalue.value.id;
        var imdbId = (jsonObj.claims.hasOwnProperty("P345"))?jsonObj.claims.P345[0].mainsnak.datavalue.value:prompt("IMDb-Id");
        var fsId = (jsonObj.claims.hasOwnProperty("P5327"))?jsonObj.claims.P5327[0].mainsnak.datavalue.value:prompt("Fernsehserien.de-Id");
        var originalLanguageId = jsonObj.claims.P364[0].mainsnak.datavalue.value.id;
        var originalCountryId = jsonObj.claims.P495[0].mainsnak.datavalue.value.id;
        var seasons = jsonObj.claims.P527?.sort((a,b) => a.qualifiers.P1545[0].datavalue.value - b.qualifiers.P1545[0].datavalue.value).map(i => i.mainsnak.datavalue.value.id)??console.error("season items are missing");
        if (location.pathname.includes("season")){
            var epSeason = document.title.match(/season (\d+)\)/)[1];
            seasons = jsonObj.claims.P527.filter(i => i.qualifiers.P1545[0].datavalue.value==Number(epSeason)).map(i => i.mainsnak.datavalue.value.id);
        }
        var wikilinks = [];
        var plainlinks = [];
        var eps = articletext.split(/{{(?:#invoke:)?Episode list.*\n|==+ *Season (\d+) |== ?(Special)s?(?: episodes?|: [^=]+)? ?(?:\((?:19|20)\d\d(?:[-–](?:19|20)?\d\d)?\))? ?==/i).filter(i => i).map(i => i.split(/\n}}\n/)[0]).slice(1);
        if (articletext.match(/== *Season \d+ /i)){
            var tempSeason = 0;
            eps.forEach((e,i) => {
                if (Number(e) || e.ToLowerCase() == "special"){
                    tempSeason = e;
                    eps.splice(i+1,1);
                }else{
                    eps[i]+="\n |Season = "+tempSeason;
                }
            });
            eps = eps.filter(i => !Number(i) && i.toLowerCase() != "special" && !i.match(/Season *= *Special *$/i));
        }
        for (var doubleEpText of eps.filter(i => i.match(/=.*<hr ?\/?>.*\n/))){
            var doubleEpIndex = eps.indexOf(doubleEpText);
            doubleEpText = doubleEpText.replace(/(Title *= )\[\[.*\|(.*)\]\]/igm,"$1$2");
            doubleEpText = doubleEpText.replace(/(Title *= )\[\[(.*)\]\]/igm,"$1$2");
            eps.splice(doubleEpIndex, 0, doubleEpText.replace(/<hr ?\/?>.*/g,"").replace(/(Title *= *.*)/ig,"$1, part 1"));
            eps[++doubleEpIndex]=doubleEpText.replace(/=.*<hr ?\/?>/g,"=").replace(/(Title *= *.*)/ig,"$1, part 2");
        }
        var episodes = eps.map(i => {
            wikilinks = wikilinks.concat([...i.matchAll(/\[\[(.*?)\]\]/g)].map(i => i[1]));
            plainlinks = plainlinks.concat([...i.matchAll(/\[\[(.*?)\]\]/g)].map(i => i[1].split("|")[1]??i[1]));
            if (i.match("DirectedBy_?1?2? *= *(\.+) *(?:\n|\|)") == null){console.error("DirectedBy\n",i);}
            if (i.match("WrittenBy_?1?2? *= *(\.+) *(?:\n|\|)") == null){console.error("WrittenBy\n",i);}
            return {
                "NR_GES": (i.match("EpisodeNumber *= *(\\d+) *(?:\n|\|)")??["",(console.error("EpisodeNumber\n",i),prompt("EpisodeNumber\n"+i.match("EpisodeNumber.*\n"))??0)])[1],
                "NR_ST": (i.match("EpisodeNumber2 *= *(\\d+) *(?:\n|\|)")??i.match("EpisodeNumber *= *(\\d+) *(?:\n|\|)")??["",(console.error("EpisodeNumber2\n",i),prompt("EpisodeNumber2\n"+i.match("EpisodeNumber2.*\n"))??0)])[1],
                "OT": (i.match("Title *= *(\.+) *(?:\n|\|)")??["",(console.error("Title\n",i),prompt("Title\n"+i.match("Title.*\n")))])[1].replace(/<!--.*?-->/i,"").split(/\[\[.*\||\[\[|\]\]/g).join("").trim().replace("{{'-}}","'").replace(/^(.*?)(?=[^\dXVI]{2}.) ?[,:\-–]? \(?(?:part )?([\dXVI]+)\)?/i,"$1, part $2"),
                "EA": getDate((i.match("OriginalAirDate *= *(\.+) *(?:\n|\|)")??["",(console.error("OriginalAirDate\n",i),"")])[1]),
                "REG": [...new Set([...[...(i.matchAll("DirectedBy_?1?2? *= *(\.+) *(?:\n|\|)"))].map(i => i[1]).join(" ").matchAll(new RegExp(plainlinks.join("|"),"g"))].map(i => i[0]).filter(i => i != "").map(p => wikilinks.filter(w => (w.split("|")[1]??w) == p)[0].split("|")[0]))],
                "DRB": [...new Set([...[...(i.matchAll("WrittenBy_?1?2? *= *(\.+) *(?:\n|\|)"))].map(i => i[1]).join(" ").matchAll(new RegExp(plainlinks.join("|"),"g"))].map(i => i[0]).filter(i => i != "").map(p => wikilinks.filter(w => (w.split("|")[1]??w) == p)[0].split("|")[0]))],
                "PROD": (i.match("ProdCode *= *(.*) *(?:\n|\|)")??["",""])[1],
                "ST": (i.match(/Season *= *(\d+) *$/)??["",""])[1],
            };
        });
        var seasonId = 0;
        var episodeId = 0;
        var articleName = location.pathname.replace(/^\/wiki\//,"");
        var source = `S143	Q328	S4656	"https://en.wikipedia.org/w/index.php?title=${articleName}&oldid=${version.revid}"`;
        var output = "";
        var lastEA = "";
        var seasonMissing = false;
        episodes.forEach(i => {
            if (i.ST){
                seasonId = Number(i.ST)-1;
            }else if (Number(i.NR_ST) < episodeId){
                seasonId++;
            }
            i.season=seasonId;
            episodeId=i.NR_ST;
            seasonMissing = (seasonId != -1 && seasons && !seasons[i.season]);
        });

        await GetEpisodeItems(seriesId, episodes);

        if (!seasons || seasonMissing){
            var quickstatements = await GetSeasonItems(seriesId);
            if (quickstatements != ""){
                //write Statements for adding seasons to series
                console.warn("Please rerun Wikidata Episode Generator after running these QuickStatements.");
                output += quickstatements;
            }else{
                //write CREATE-Statements for seasons
                console.warn("Please wait some time after running these QuickStatements and then rerun Wikidata Episode Generator.");
                episodeId = 0;
                episodes.forEach(ep => {
                    if (!seasons || !seasons[ep.season-1]) {
                        //new season, first episode
                        if (Number(ep.NR_ST) < episodeId){
                            output +=`LAST	P582	+${lastEA}T00:00:00Z/11	P291	${originalCountryId}	${source}
LAST	P1113	${episodeId}	${source}
`;
                        }
                    }
                    if (!seasons || !seasons[ep.season]) {
                        //new season
                        if (ep.NR_GES == 1 || Number(ep.NR_ST) < episodeId){
                            output += `CREATE
LAST	Len	"${seriesEn}, season ${ep.season+1}"
LAST	Lde	"${series}/Staffel ${ep.season+1}"
LAST	Den	"season of ${seriesEn}"
LAST	Dde	"Staffel von ${series}"
LAST	P31	Q3464665
LAST	P179	${seriesId}	P1545	"${ep.season+1}"	${source}
LAST	P364	${originalLanguageId}	${source}
LAST	P495	${originalCountryId}	${source}
LAST	P449	${networkId}	${source}
LAST	P580	+${ep.EA}T00:00:00Z/11	P291	${originalCountryId}	${source}
`;
                        }
                        //last episode
                        if (ep.NR_GES == episodes.length){
                            output +=`LAST	P582	+${ep.EA}T00:00:00Z/11	P291	${originalCountryId}	${source}
LAST	P1113	${ep.NR_ST}	${source}
`;
                        }
                    }
                    lastEA = ep.EA
                    ep.season = seasonId;
                    episodeId = ep.NR_ST;
                })
            }
        }
        else
        {
            if (fsId){
                await GetFSData(fsId, episodes);
            }
            if (imdbId){
                await GetIMDbIds(imdbId, episodes);
            }
            await GetWikipediaLinks(episodes);
            //write CREATE-Statements for episodes, get DRB and REG
            episodes.forEach(ep => {
                var epText = `CREATE
LAST	Len	"${ep.OT}"
`;
                if (ep.hasOwnProperty("DT")){
                    epText += `LAST	Lde	"${ep.DT}"
`;
                }
                epText +=`LAST	Den	"episode of ${seriesEn}"
LAST	Dde	"Folge von ${series}"
LAST	Dnl	"aflevering van ${seriesNl}"
LAST	P1476	en:"${ep.OT}"	${source}
LAST	P31	Q21191270
LAST	P179	${seriesId}	P1545	"${ep.NR_GES}"	${source}
`;
                if (seasons[ep.season]){
                    epText +=`LAST	P4908	${seasons[ep.season]}	P1545	"${ep.NR_ST}"	${source}
`;
                } else {
                    console.error("season not found\n", ep);
                }
                epText +=`LAST	P449	${networkId}	${source}
LAST	P364	${originalLanguageId}	${source}
LAST	P495	${originalCountryId}	${source}
LAST	P577	+${ep.EA}T00:00:00Z/11	P291	${originalCountryId}	${source}
`;
                if (ep.hasOwnProperty("EAD") && ep.EAD != ""){
                    ep.EAD = ep.EAD.replace(/(\d{2})\.(\d{2})\.(\d{4})/,"$3-$2-$1");
                    var fsSource = `S248	Q54871129	S5327	"${fsId}"	S813	+${new Date().toISOString().slice(0,10)}T00:00:00Z/11`;
                    epText += `LAST	P577	+${ep.EAD}T00:00:00Z/11	P291	Q183	${fsSource}
`;
                }
                ep.REGid.forEach(reg => {
                    epText += `LAST	P57	${reg}	${source}
`;});
                ep.DRBid.forEach(drb => {
                    epText += `LAST	P58	${drb}	${source}
`;});
                if (ep.PROD != ""){
                    epText += `LAST	P2364	"${ep.PROD}"	${source}
`;
                }
                if (ep.hasOwnProperty("imdb")){
                    epText += `LAST	P345	"${ep.imdb}"
`;
                }
                if (ep.hasOwnProperty("OTid")){
                    epText = epText.replace(/LAST\sDen.*\nLAST\sDde.*\nLAST\sDnl.*\n/, "");
                    epText = epText.replace(/(CREATE\n)?LAST/g, ep.OTid);
                    epText = epText.replace(/\tS4656\t.*/g, "");
                }
                if (epText.match(/\bundefined\b/))
                    console.error("episode includes undefined value\n", epText);
                output += epText;
            });
        }
        console.log(output);
        console.warn("Please check all QuickStatements for correctness before execution at https://quickstatements.toolforge.org/#/batch.");
        GM.setClipboard(output);
    }),"w");
    function getDate(episodeDate){
        var result = episodeDate.replace(/{{start date(?:\|[md]f=y(?:es)?)?\|(\d+)\|(\d+)\|(\d+)(?:\|[md]f=y(?:es)?)?}}.*/i,"$1-$2-$3").replace(/-(\d)\b/g,"-0$1");
        if (!/[1-2][09]\d\d-[0-1]\d-[0-3]\d/.test(result)){
            console.error("OriginalAirDate",episodeDate);
        }
        return result;
    }
    function compareString(title){
        if (!title)
            return null;
        var partEp = title.match(/^(.*?)(?=[^\d]{2}.) ?[,:\-–]? \(?(?:(?:part|teil) )?#?([\dXVI]+)\)? *$/i);
        if (partEp)
            title = partEp[1] + (Number(partEp[2]) ? getRomanNumber(partEp[2]) : partEp[2]);
        return title.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/&/i, "and").replace(/^the |^a |[\u200B-\u200D\uFEFF]| |\.|'|’|\(|\)|:|,|‚|\?|!|„|“|"|‘|…|\.|—|–|-/gi,"");
    }
    function getRomanNumber(n){
        return n = Number(n) && "x10ix9v5iv4i1".replace(/(\D+)(\d+)/g,(_,r,d)=>r.repeat(n/d,n%=d));
    }
    function levenshteinDistance(str1, str2){
        if (!str1 || !str2){
            return 100;
        }
        var track = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i += 1){
            track[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j += 1){
            track[j][0] = j;
        }
        for (let j = 1; j <= str2.length; j += 1){
            for (let i = 1; i <= str1.length; i += 1){
                var indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1,
                    track[j - 1][i] + 1,
                    track[j - 1][i - 1] + indicator,
                );
            }
        }
        return track[str2.length][str1.length];
    }
    async function GetEpisodeItems(qid, episodes){
        console.log("loading episode items from Wikidata…");
        var request = `SELECT ?qid ?nrAll ?seasonNr ?nrSeason ?OT WHERE {
  BIND(wd:${qid} AS ?series)
  ?pSeries ps:P179 ?series.
  ?q wdt:P31 wd:Q21191270;
    p:P179 ?pSeries.
  OPTIONAL { ?pSeries pq:P1545 ?nrAll. }
  OPTIONAL {
    ?q p:P4908 _:0.
    _:0 pq:P1545 ?nrSeason.
  }
  OPTIONAL {
    ?q wdt:P4908 _:1.
    _:1 rdfs:label ?wSeason.
    FILTER((LANG(?wSeason)) = "en")
    BIND(REPLACE(STR(?wSeason), ".* ", "") AS ?seasonNr)
  }
  OPTIONAL {
    ?q rdfs:label ?OT.
    FILTER((LANG(?OT)) = "en")
  }
  BIND(REPLACE(STR(?q),".*/","") as ?qid).
}
GROUP BY ?qid ?nrAll ?nrSeason ?seasonNr ?OT`;
        var resp = await fetch("https://query.wikidata.org/sparql?format=json", {
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Accept": "application/sparql-results+json"
            },
            "body": "query=" + encodeURIComponent(request).replaceAll("%20","+").replaceAll("%5Cd","%5C%5Cd"),
            "method": "POST",
            "mode": "cors"
        });
        var obj = await resp.json();
        var sparqlEps = obj.results.bindings;
        for (let ep of sparqlEps){
            var sparqlEp = episodes.filter(e => compareString(e.OT) == compareString(ep.OT.value));
            if (sparqlEp.length == 1){
                sparqlEp[0].OTid = ep.qid.value;
            }else{
                var matchedEp = episodes.reduce(function(prev, curr) {
                    return levenshteinDistance(compareString(prev.OT), compareString(ep.OT.value)) <= levenshteinDistance(compareString(curr.OT), compareString(ep.OT.value)) ? prev : curr;
                });
                var epSeason;
                if (location.pathname.includes("season")){
                    epSeason = document.title.match(/season (\d+)\)/)[1];
                }else{
                    epSeason = matchedEp.season + 1;
                }
                var matchedEpNr = epSeason + "x" + (matchedEp.NR_ST.length==1?"0":"") + matchedEp.NR_ST;
                var epNr = (ep.seasonNr?.value??"0") + "x" + ((ep.nrSeason?.value.length??1)==1?"0":"") + (ep.nrSeason?.value ?? "0");
                if (matchedEp.NR_GES != ep.nrAll.value && epNr != matchedEpNr){
                    var message = `Wikipedia: #${matchedEp.NR_GES} / ${matchedEpNr} ${matchedEp.OT}
Wikidata-ID from Wikidata: #${ep.nrAll.value} / ${epNr} ${ep.OT.value}`
                    if (confirm("fuzzy match?\n" + message)){
                        matchedEp.OTid = ep.qid.value;
                        message = "matched:\n" + message;
                    }else{
                        message = "not matched:\n" + message;
                    }
                    console.log(message);
                }else{
                    matchedEp.OTid = ep.qid.value;
                }
            }
        };
    }
    async function GetSeasonItems(qid){
        console.log("loading season items from Wikidata…");
        var request = `SELECT ?quickstatements WHERE {
  BIND(wd:${qid} AS ?series)
  ?qid wdt:P31 wd:Q3464665;
    p:P179 _:s.
  _:s ps:P179 ?series;
    pq:P1545 ?number.
  BIND(CONCAT(REPLACE(STR(?series), ".*/", ""), "	P527	", REPLACE(STR(?qid), ".*/", ""), "	P1545	\\"", ?number, "\\"") AS ?quickstatements)
  MINUS {
    ?series p:P527 ?pQid.
    ?pQid ps:P527 ?qid.
    ?pQid pq:P1545 ?number.
  }
}
ORDER BY (xsd:integer(?number))`;
        var resp = await fetch("https://query.wikidata.org/sparql?format=json", {
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "Accept": "application/sparql-results+json"
            },
            "body": "query=" + encodeURIComponent(request).replaceAll("%20","+").replaceAll("%5Cd","%5C%5Cd"),
            "method": "POST",
            "mode": "cors"
        });
        var obj = await resp.json();
        var sparqlSeasons = obj.results.bindings;
        return sparqlSeasons.map(i => i.quickstatements.value).join("\n");
    }
    async function GetFSData(fsId, episodes){
        var url = `https://www.fernsehserien.de/${fsId}/episodenguide`;
        console.log(`loading German labels and dates from Fernsehserien.de… (${url})`);
        var fsDatas = [];
        var response = await GM.xmlHttpRequest({
            method: "GET",
            url: url,
            onload: function(response) {
                return response;
            }
        });
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(response.responseText,"text/html");
        fsDatas = [...xmlDoc.querySelectorAll("a[data-event-category=liste-episoden]")].map(a => {return{"Lde": a.querySelector("div:nth-child(7)>span").innerText.replace(/^(.*?)(?=[^\d]{2}.) ?[,:\-–]? \(?(?:Teil )?(\d+)\)?/i,"$1 – Teil $2"), "Len": a.querySelector("div:nth-child(7)>span.episodenliste-schmal")?.innerText.replace(/ \(a\.k\.a\..*?\)/i,""), "nr": a.querySelector("div:nth-child(2)")?.firstChild?.nodeValue, "epNr": a.querySelector("span:nth-child(1)").innerText.replace(".","x"), "ead": a.querySelector("div:nth-child(8)").childNodes[0]?.data?.trim()}});
        for (var ep of episodes){
            let ot = ep.OT;
            var fsData = fsDatas.filter(id => compareString(id.Len) == compareString(ot));
            if (fsData.length == 1){
                if (fsData[0].Lde != "–"){
                    ep.DT = fsData[0].Lde;
                    if (fsData[0].ead != "")
                        ep.EAD = fsData[0].ead;
                }
            }else{
                var matchedEp = fsDatas.reduce(function(prev, curr) {
                    return levenshteinDistance(compareString(prev.Len), compareString(ot)) < levenshteinDistance(compareString(curr.Len), compareString(ot)) ? prev : curr;
                });
                var epSeason;
                if (location.href.includes("season")){
                    epSeason = document.title.match(/season (\d+)\)/)[1];
                }else{
                    epSeason = ep.season + 1;
                }
                var epNr = epSeason + "x" + (ep.NR_ST.length==1?"0":"") + ep.NR_ST;
                if (matchedEp.Lde != "–"){
                    if (ep.NR_GES != matchedEp.nr && epNr != matchedEp.epNr){
                        var message = `Wikipedia: #${ep.NR_GES} / ${epNr} ${ot}
data from Fernsehserien.de: #${matchedEp?.nr ?? 0} / ${matchedEp.epNr} ${matchedEp.Len}`
                        if (confirm("fuzzy match?\n" + message)){
                            ep.DT = matchedEp.Lde;
                            if (matchedEp.ead != "")
                                ep.EAD = matchedEp.ead;
                            message = "matched:\n" + message;
                        }else{
                            message = "not matched:\n" + message;
                        }
                        console.log(message);
                    }else{
                        ep.DT = matchedEp.Lde;
                    }
                }
            }
        };
    };
    async function GetIMDbIds(imdbId, episodes){
        var url = `https://www.imdb.com/search/title/?series=${imdbId}&view=simple&sort=release_date,asc&count=250`;
        console.log(`loading IDs from IMDb… (${url})`);
        var imdbIds = [];
        var startEp = 1;
        var allEps = 0;
        do{
            var response = await GM.xmlHttpRequest({
                method: "GET",
                url: `${url}&start=${startEp}`,
                onload: function(response) {
                    return response;
                }
            });
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(response.responseText,"text/html");
            imdbIds = imdbIds.concat([...xmlDoc.querySelectorAll(".lister-item-header a:nth-child(5)")].map(i => {return {"title": i.innerText, "id": i.href.split("/")[4], "nr": i.parentElement.parentElement.querySelector(".text-primary").innerText.replace(".","")}}));
            allEps = xmlDoc.querySelector(".desc>span").innerText.split(" ")[2];
            startEp = startEp + 250;
        } while (imdbIds.length < allEps);
        for (var ep of episodes){
            let ot = ep.OT;
            let imdbId = imdbIds.filter(id => compareString(id.title) == compareString(ot));
            if (imdbId.length == 1){
                ep.imdb = imdbId[0].id;
            }else{
                var matchedEp = imdbIds.reduce(function(prev, curr) {
                    return levenshteinDistance(compareString(prev.title), compareString(ot)) <= levenshteinDistance(compareString(curr.title), compareString(ot)) ? prev : curr;
                });
                if (ep.NR_GES == matchedEp.nr){
                    ep.imdb = matchedEp.id;
                }else{
                    var epSeason;
                    if (location.pathname.includes("season")){
                        epSeason = document.title.match(/season (\d+)\)/)[1];
                    }else{
                        epSeason = ep.season + 1;
                    }
                    var message = `Wikipedia: #${ep.NR_GES} / ${epSeason}x${(ep.NR_ST.length==1?"0":"")}${ep.NR_ST} ${ot}
IMDb-ID from IMDb: #${matchedEp.nr} ${matchedEp.title}`;
                    if (confirm("fuzzy match?\n"+message)){
                        ep.imdb = matchedEp.id;
                        message = "matched:\n" + message;
                    }else{
                        message = "not matched:\n" + message;
                    }
                    console.log(message);
                }
            }
        };
    };
    async function GetWikipediaLinks(episodes){
        console.log("loading Wikipedia article links from Wikidata…");
        var cachedLinks = [];
        for (var ep of episodes){
            ep.DRBid = [];
            ep.REGid = [];
            for (let drb of ep.DRB){
                var cachedDRB = cachedLinks.filter(i => i.name == drb);
                if (cachedDRB.length != 0){
                    ep.DRBid.push(cachedDRB[0].qid);
                }else{
                    var response = await fetch(`/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(drb)}&format=json`);
                    var data = await response.json();
                    if (Object.values(data.query.pages)[0].pageprops != null){
                        ep.DRBid.push(Object.values(data.query.pages)[0].pageprops.wikibase_item);
                        cachedLinks.push({"name":drb,"qid":Object.values(data.query.pages)[0].pageprops.wikibase_item});
                    }
                }
            };
            for (let reg of ep.REG){
                var cachedREG = cachedLinks.filter(i => i.name == reg);
                if (cachedREG.length != 0){
                    ep.REGid.push(cachedREG[0].qid);
                }else{
                    response = await fetch(`/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(reg)}&format=json`);
                    data = await response.json();
                    if (Object.values(data.query.pages)[0].pageprops != null){
                        ep.REGid.push(Object.values(data.query.pages)[0].pageprops.wikibase_item);
                        cachedLinks.push({"name":reg,"qid":Object.values(data.query.pages)[0].pageprops.wikibase_item});
                    }
                }
            };
            if (ep.OT.match(/\[\[.*\]\]/) != null && !ep.hasOwnProperty("OTid")){
                var ot = ep.OT.match(/\[\[(.*)\]\]/)[1];
                ot = ot.replace(/\|.*/,"");
                response = await fetch(`/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&titles=${encodeURIComponent(ot)}&format=json`);
                data = await response.json();
                if (Object.values(data.query.pages)[0].pageprops != null){
                    ep.OTid = Object.values(data.query.pages)[0].pageprops.wikibase_item;
                }
            };
        }
    }
})();
