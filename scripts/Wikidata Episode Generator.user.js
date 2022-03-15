// ==UserScript==
// @name         Wikidata Episode Generator
// @version      0.5.5
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
/* eslint curly: "off" */

(function() {
    "use strict";
    GM.registerMenuCommand("convert episode lists for Wikidata",
                           (async()=>{
        console.clear();
        var article = document.title.split(" – Wikipedia")[0];
        var response = await fetch(`/w/api.php?action=query&prop=revisions|pageprops&titles=${encodeURIComponent(article)}&rvslots=*&rvprop=content&formatversion=2&format=json`);
        var data = await response.json();
        var articletext = Object.values(data.query.pages)[0].revisions[0].slots.main.content;
        var subArticles = articletext.match(/{{:(.*)}}/g);
        if (subArticles != null){
            console.log("loading sub articles from Wikipedia…");
            for (var sub of subArticles){
                response = await fetch(`/w/api.php?action=query&prop=revisions|pageprops&titles=${encodeURIComponent(sub.replace(/{{:|}}/g,""))}&rvslots=*&rvprop=content&formatversion=2&format=json`);
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
        var seasons = jsonObj.claims.P527.sort((a,b) => a.qualifiers.P1545[0].datavalue.value - b.qualifiers.P1545[0].datavalue.value).map(i => i.mainsnak.datavalue.value.id);
        if (location.href.includes("season")){
            var epSeason = document.title.match(/season (\d+)\)/)[1];
            seasons = jsonObj.claims.P527.filter(i => i.qualifiers.P1545[0].datavalue.value==Number(epSeason)).map(i => i.mainsnak.datavalue.value.id);
        }
        var wikilinks = [];
        var eps = articletext.split(/{{Episode list.*\n/).map(i => i.split(/\n}}\n/)[0]).slice(1);
        for (var doubleEpText of eps.filter(i => i.match(/=.*<hr>.*\n/))){
            var doubleEpIndex = eps.indexOf(doubleEpText);
            doubleEpText = doubleEpText.replace(/(Title *= )\[\[.*\|(.*)\]\]/igm,"$1$2");
            doubleEpText = doubleEpText.replace(/(Title *= )\[\[(.*)\]\]/igm,"$1$2");
            eps.splice(doubleEpIndex, 0, doubleEpText.replace(/<hr>.*/g,"").replace(/(Title *= *.*)/ig,"$1, part 1"));
            eps[++doubleEpIndex]=doubleEpText.replace(/=.*<hr>/g,"=").replace(/(Title *= *.*)/ig,"$1, part 2");
        }
        var episodes = eps.map(i => {
            wikilinks = wikilinks.concat([...i.matchAll(/\[\[(.*?)\]\]/g)].map(i => i[1].split("|")[0]));
            return {
                "NR_GES": (i.match("EpisodeNumber *= *(\\d+) *\n")??["",(console.log("ERROR: EpisodeNumber\n",i),prompt("EpisodeNumber\n"+i.match("EpisodeNumber.*\n"))??0)])[1],
                "NR_ST": (i.match("EpisodeNumber2 *= *(\\d+) *\n")??["",(console.log("ERROR: EpisodeNumber\n",i),prompt("EpisodeNumber2\n"+i.match("EpisodeNumber2.*\n"))??0)])[1],
                "OT": (i.match("Title *= *(\.+) *\n")??["",(console.log("ERROR: Title\n",i),prompt("Title\n"+i.match("Title.*\n")))])[1].replace(/<!--.*?-->/i,""),
                "EA": getDate((i.match("OriginalAirDate *= *(\.+) *\n")??["",(console.log("ERROR: OriginalAirDate\n",i),"")])[1]),
                "REG": [...new Set([...(i.match("DirectedBy_?1?2? *= *(\.+) *\n")??["",(console.log("ERROR: DirectedBy\n",i),"")])[1].matchAll(new RegExp(wikilinks.join("|"),"g"))].map(i => i[0]).filter(i => i != ""))],
                "DRB": [...new Set([...(i.match("WrittenBy_?1?2? *= *(\.+) *\n")??["",(console.log("ERROR: WrittenBy\n",i),"")])[1].matchAll(new RegExp(wikilinks.join("|"),"g"))].map(i => i[0]).filter(i => i != ""))]
            };
        });
        var seasonId = 0;
        var episodeId = 0;
        var wikipediaLink = location.href.split("#")[0];
        var output = "";

        episodes.forEach(i => {
            if (Number(i.NR_ST)<episodeId){
                seasonId++;
            }
            i.season=seasonId;
            episodeId=i.NR_ST;
        });

        await GetEpisodeItems(seriesId, episodes);
        if (fsId){
            await GetFSLabels(fsId, episodes);
        }
        if (imdbId){
            await GetIMDbIds(imdbId, episodes);
        }
        await GetWikipediaLinks(episodes);

        //write CREATE-Statements, get DRB and REG
        episodes.forEach(ep => {
            if (ep.OT.match(/\[\[.*\]\]/) != null){
                ep.OT = ep.OT.match(/\[\[(.*)\]\]/)[1];
                ep.OT = ep.OT.replace(/.*\|/,"");
            }
            ep.OT = ep.OT.replace(/^(.*?)(?=[^\d]{2}.) ?[,:\-–]? \(?(?:part )?(\d+)\)?/i,"$1, part $2");
            var epText = `CREATE
LAST	Len	"${ep.OT}"
`;
            if (ep.hasOwnProperty("DT")){
                ep.DT = ep.DT.replace(/^(.*?)(?=[^\d]{2}.) ?[,:\-–]? \(?(?:Teil )?(\d+)\)?/i,"$1 – Teil $2");
                epText += `LAST	Lde	"${ep.DT}"
`;
            }
            epText +=`LAST	Den	"episode of ${seriesEn}"
LAST	Dde	"Folge von ${series}"
LAST	Dnl	"aflevering van ${seriesNl}"
LAST	P1476	en:"${ep.OT}"	S143	Q328	S4656	"${wikipediaLink}"
LAST	P31	Q21191270	S143	Q328	S4656	"${wikipediaLink}"
LAST	P179	${seriesId}	P1545	"${ep.NR_GES}"	S143	Q328	S4656	"${wikipediaLink}"
LAST	P4908	${seasons[ep.season]}	P1545	"${ep.NR_ST}"	S143	Q328	S4656	"${wikipediaLink}"
LAST	P449	${networkId}	S143	Q328	S4656	"${wikipediaLink}"
LAST	P364	${originalLanguageId}	S143	Q328	S4656	"${wikipediaLink}"
LAST	P495	${originalCountryId}	S143	Q328	S4656	"${wikipediaLink}"
LAST	P577	+${ep.EA}T00:00:00Z/11	P291	Q30	S143	Q328	S4656	"${wikipediaLink}"
`;
            if (ep.hasOwnProperty("imdb")){
                epText += `LAST	P345	"${ep.imdb}"
`;
            }
            ep.REGid.forEach(reg => {
                epText += `LAST	P57	${reg}	S143	Q328	S4656	"${wikipediaLink}"
`;});
            ep.DRBid.forEach(drb => {
                epText += `LAST	P58	${drb}	S143	Q328	S4656	"${wikipediaLink}"
`;});
            if (ep.hasOwnProperty("OTid")){
                epText = epText.replace(/LAST\sDen.*\nLAST\sDde.*\nLAST\sDnl.*\n/,"");
                epText = epText.replace(/(CREATE\n)?LAST/g,ep.OTid);
            }
            output += epText;
        });
        console.log(output);
        GM.setClipboard(output);
    }),"w");
    function getDate(episodeDate){
        var result = episodeDate.replace(/{{start date(?:\|df=yes)?\|(\d+)\|(\d+)\|(\d+)(?:\|df=yes)?}}.*/i,"$1-$2-$3").replace(/-(\d)\b/g,"-0$1");
        if (!/[1-2][09]\d\d-[0-1]\d-[0-3]\d/.test(result)){
            console.log("ERROR: OriginalAirDate",episodeDate);
        }
        return result;
    }
    function compareString(title){
        if (!title){
            return null;
        }
        return title.trim().toLowerCase().replace(/^(.*?)(?=[^\d]{2}.) ?[,:\-–]? \(?(?:(?:part|teil) )?(\d+)\)? *$/i,"$1$2").replace(/&/i, "and").replace(/^the |^a |[\u200B-\u200D\uFEFF]| |\.|'|’|\(|\)|:|,|‚|\?|!|„|“|"|‘|…|\.|—|–|-/gi,"");
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
            var sparqlEp = episodes.filter(e => compareString(e.OT.split(/\[\[.*\||\[\[|\]\]/g).filter(n => n)[0]) == compareString(ep.OT.value));
            if (sparqlEp.length == 1){
                sparqlEp[0].OTid = ep.qid.value;
            }else{
                var matchedEp = episodes.reduce(function(prev, curr) {
                    return levenshteinDistance(compareString(prev.OT), compareString(ep.OT.value)) < levenshteinDistance(compareString(curr.OT), compareString(ep.OT.value)) ? prev : curr;
                });
                var epSeason;
                if (location.href.includes("season")){
                    epSeason = document.title.match(/season (\d+)\)/)[1];
                }else{
                    epSeason = matchedEp.season + 1;
                }
                var matchedEpNr = epSeason + "x" + (matchedEp.NR_ST.length==1?"0":"") + matchedEp.NR_ST;
                var epNr = ep.seasonNr.value + "x" + (ep.nrSeason.value.length==1?"0":"") + ep.nrSeason.value;
                if (matchedEp.NR_GES != ep.nrAll.value && epNr != matchedEpNr){
                    var message = `Wikipedia: #${matchedEp.NR_GES} / ${matchedEpNr} ${matchedEp.OT}
Wikidata: #${ep.nrAll.value} / ${epNr} ${ep.OT.value}`
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
    async function GetFSLabels(fsId, episodes){
        console.log("loading German labels from Fernsehserien.de…");
        var fsLabels = [];
        var response = await GM.xmlHttpRequest({
            method: "GET",
            url: `https://www.fernsehserien.de/${fsId}/episodenguide`,
            onload: function(response) {
                return response;
            }
        });
        var parser = new DOMParser();
        var xmlDoc = parser.parseFromString(response.responseText,"text/html");
        fsLabels = [...xmlDoc.querySelectorAll("a[data-event-category=liste-episoden]")].map(a => {return{"Lde": a.querySelector("div:nth-child(7)>span").innerText, "Len": a.querySelector("div:nth-child(7)>span.episodenliste-schmal")?.innerText, "nr": a.querySelector("div:nth-child(2)")?.firstChild?.nodeValue, "epNr": a.querySelector("span:nth-child(1)").innerText.replace(".","x")}});
        for (var ep of episodes){
            let ot = ep.OT;
            if (ot.match(/\[\[.*\]\]/) != null){
                ot = ot.match(/\[\[(.*)\]\]/)[1];
                ot = ot.replace(/.*\|/,"");
            }
            var fsLabel = fsLabels.filter(id => compareString(id.Len) == compareString(ot));
            if (fsLabel.length == 1){
                if (fsLabel[0].Lde != "–"){
                    ep.DT = fsLabel[0].Lde;
                }
            }else{
                var matchedEp = fsLabels.reduce(function(prev, curr) {
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
Fernsehserien.de: #${matchedEp.nr} / ${matchedEp.epNr} ${matchedEp.Len}`
                        if (confirm("fuzzy match?\n" + message)){
                            ep.DT = matchedEp.Lde;
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
        console.log("loading IDs from IMDb…");
        var imdbIds = [];
        var startEp = 1;
        var allEps = 0;
        do{
            var response = await GM.xmlHttpRequest({
                method: "GET",
                url: `https://www.imdb.com/search/title/?series=${imdbId}&view=simple&sort=release_date,asc&count=250&start=${startEp}`,
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
            if (ot.match(/\[\[.*\]\]/) != null){
                ot = ot.match(/\[\[(.*)\]\]/)[1];
                ot = ot.replace(/.*\|/,"");
            }
            let imdbId = imdbIds.filter(id => compareString(id.title) == compareString(ot));
            if (imdbId.length == 1){
                ep.imdb = imdbId[0].id;
            }else{
                var matchedEp = imdbIds.reduce(function(prev, curr) {
                    return levenshteinDistance(compareString(prev.title), compareString(ot)) < levenshteinDistance(compareString(curr.title), compareString(ot)) ? prev : curr;
                });
                if (ep.NR_GES == matchedEp.nr){
                    ep.imdb = matchedEp.id;
                }else{
                    var epSeason;
                    if (location.href.includes("season")){
                        epSeason = document.title.match(/season (\d+)\)/)[1];
                    }else{
                        epSeason = ep.season + 1;
                    }
                    var message = `Wikipedia: #${ep.NR_GES} / ${epSeason}x${(ep.NR_ST.length==1?"0":"")}${ep.NR_ST} ${ot}
IMDb: #${matchedEp.nr} ${matchedEp.title}`;
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
