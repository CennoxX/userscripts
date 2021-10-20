// ==UserScript==
// @name         Wikipedia Artikel Generator
// @namespace    https://greasyfork.org/users/21515
// @version      0.6.0
// @description  Erstelle Wikipedia-Artikel aus Wikidata-Daten
// @author       CennoxX
// @contact      cesar.bernard@gmx.de
// @homepage     https://twitter.com/CennoxX
// @match        https://de.wikipedia.org/w/index.php?title=*&action=edit*
// @connect      www.wikidata.org
// @connect      www.imdb.com
// @icon         https://www.google.com/s2/favicons?sz=64&domain=de.wikipedia.org
// @grant        GM.xmlHttpRequest
// @grant        GM.setClipboard
// @license      MIT
// ==/UserScript==
/* jshint esversion: 8 */
/* globals jQuery, $, mw */
(async()=>{
    'use strict';
    if (!document.title.includes("“ – Erstellen")){
        return
    }
    var wikiText = "";
    var wikidataId = await getWikidataIdFromPrompt();
    $('#wpTextbox1').textSelection('setContents', "Lädt ...");
    let wikiItem = (await getEntitiesFromIds(wikidataId,"sitelinks|claims|labels|aliases|descriptions"))[0];
    wikiText = await getArticleFromSPARQL(wikidataId);
    $('#wpTextbox1').textSelection('setContents', wikiText.replace(/\n\n\n+/g,"\n\n").replace(/  +/g," ").replace("{{FILMOGRAPHY}}","== Filmografie ==\n..."));
    //Filmografie
    let imdbid = getPropertyFromItem(wikiItem,"P345");
    let filmography = "";
    if (imdbid != "")
    {
        filmography = await ladeFilmografie(imdbid);
    }
    wikiText = wikiText.replace("{{FILMOGRAPHY}}",filmography);
    wikiText = wikiText.replace(/\n\n\n+/g,"\n\n").replace(/  +/g," ");
    //result
    $('#wpTextbox1').textSelection('setContents', wikiText);
    //methods
    function getWikilinkFromItem(wikiItem){
        let label = wikiItem.labels.de.value
        if (Object.values(wikiItem.sitelinks).length != 0)
        {
            let sitelink = wikiItem.sitelinks.dewiki.title;
            return `[[${sitelink + (label == sitelink?``:`|${label}`)}]]`;
        }
        else
        {
            return label;
        }
    }
    function getPropFromItem(wikiItem,property){
        return wikiItem[property].de.value;
    }
    function getPropertyFromItem(wikiItem,property){
        let claims = wikiItem.claims[property];
        if (claims == undefined)
        {
            return "";
        }
        else if (claims.length == 1)
        {
            return claims[0].mainsnak.datavalue.value;
        }
        else
        {
            //only for id?
            return claims.map(i=>i.mainsnak.datavalue.value.id).join("|");
        }
    }
    async function getWikilinksFromIds(ids){
        let wikiItems = await getEntitiesFromIds(ids, "sitelinks|labels");
        let items = wikiItems.map(wikiItem =>
                                  {
            let label = wikiItem.labels.de.value;
            if (Object.values(wikiItem.sitelinks).length != 0)
            {
                let sitelink = wikiItem.sitelinks.dewiki.title;
                return `[[${sitelink + (label == sitelink?``:`|${label}`)}]]`;
            }
            else
            {
                return label;
            }
        });
        return items.slice(0, -1).join(', ')+(items.length!=1?' und ':'')+items.slice(-1);
    }
    async function getWikidataIdFromPrompt(){
        let articleTitle = document.title.match("„(.*?)( \\(.*)?“")[1];
        let searchRequest = await GM.xmlHttpRequest({
            method: 'GET',
            url: 'https://www.wikidata.org/w/api.php?action=query&format=json&list=search&srlimit=5&srsearch=' + articleTitle,
            onload: function(response) {
                return response;
            }
        });
        let searchItem = JSON.parse(searchRequest.responseText);
        let ids = searchItem.query.search.map(i => i.title).join("|");
        let descriptionRequest = await GM.xmlHttpRequest({
            method: 'GET',
            url: 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|labels|descriptions&languages=de&sitefilter=dewiki&languagefallback=true&ids=' + ids,
            onload: function(response) {
                return response;
            }
        });
        let descriptionItems = JSON.parse(descriptionRequest.responseText);
        let filteredDescriptionItems = Object.values(descriptionItems.entities).filter(i => Object.values(i.sitelinks).length!=1);
        let promptText = "Wähle den passenden Eintrag:\n";
        promptText += filteredDescriptionItems.map((i,e) => (Number(e+1) + ": "+i.labels.de.value+" ("+(i.descriptions.de?.value??"")+")").replace("((","(").replace("))",")").replace(" ()","")).join("\n");
        let id = prompt(promptText);
        if (id.startsWith("Q")){
            return id;
        }
        return filteredDescriptionItems[id-1].id;
    }
    async function getEntitiesFromIds(ids,props){
        let wikidataRequest = await GM.xmlHttpRequest({
            method: 'GET',
            url: `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=${props}&languages=de&languagefallback=true&sitefilter=dewiki&ids=${ids}`,
            onload: function(response) {
                return response;
            }
        });
        let item = JSON.parse(wikidataRequest.responseText);
        let results = Object.values(item.entities);
        if (results.length == 0){
            return "";
        }else{
            return results;
        }
    }
    async function ladeFilmografie(imdbid){
        var imdbRequest = await GM.xmlHttpRequest({
            method: 'GET',
            url: `https://www.imdb.com/name/${imdbid}/`,
            onload: function(response) {
                return response;
            }
        });
        var html=document.createElement("div");
        html.innerHTML = imdbRequest.responseText;
        html.querySelectorAll("link").forEach(i =>{i.href="";});
        var occupation='actor,#filmo-head-actress';
        var showShort=true;
        var episodeLabel='Folge';
        var showAlert=false;
        var workSection = html.querySelector('#filmo-head-' + occupation);
        if (!workSection){
            workSection = html.querySelector('#filmography').firstElementChild;
        }
        var work = workSection.nextElementSibling.children;
        var filmography = [];
        var request = 0;
        var done = 0;

        [...work].forEach(w => {
            var credit = new Credit();
            var years = w.querySelector('.year_column').innerText.trim().split('/')[0].split('-');
            credit.yearFrom = years[0];
            credit.yearTo = years[1]?years[1]:0;
            credit.dt = w.querySelector('a').innerText.replace(' - ', ' – ').replace('...', '…');
            var entry = w.innerHTML.split('</b>')[1];
            var creditType = entry.split('<br>')[0].replace(/\)?\n\(voice/,'').trim();
            if (creditType.includes('in_production') || creditType.includes('Video Game')){
                return;
            }
            credit.type = creditType
                .replace(/\(Documentary short\)/, 'Dokumentar-Kurzfilm')
                .replace(/\((TV Movie d|D)ocumentary\)/, 'Dokumentarfilm')
                .replace(/\(TV Series short\)/, 'Webserie')
                .replace(/\(TV Series( documentary)?\)/, 'Fernsehserie')
                .replace(/\(TV Mini Series( documentary)?\)/, 'Miniserie')
                .replace(/\(TV Movie\)/, 'Fernsehfilm')
                .replace(/\((Video s|TV S|TV Mini Series s|S)hort\)/, 'Kurzfilm')
                .replace(/ ?\(.*\)/, '').split('\n')[0]; //strip everything else

            if (!showShort || credit.type.includes('Kurzfilm')){
                return;
            }
            credit.imdbid = w.getAttribute('id').split('-')[1];
            getItemFromWikidata(credit.imdbid);
            if (credit.type.includes('serie')){
                var voiceEpisodes = 0;
                var allEpisodes = w.querySelectorAll('.filmo-episodes');
                var isYearFromEmpty = !credit.yearFrom;
                allEpisodes.forEach(episode => {
                    if (episode.innerText.includes('credit only') || episode.innerText == 'Show less'){
                        return;
                    }
                    if (isYearFromEmpty){
                        var from = episode.innerHTML.split('\n')[2].match(/\((\d{4})\)/);
                        if (from){
                            credit.yearFrom = from[1];
                        }
                    }
                    if (!credit.yearTo){
                        var to = episode.innerHTML.split('\n')[2].match(/\((\d{4})\)/);
                        if (to){
                            credit.yearTo = to[1];
                        }
                    }
                    credit.numberOfEpisodes++;
                    credit.episodeName = episode.querySelector('a').href.split('/')[4];
                    if (episode.innerText.includes('voice')){
                        voiceEpisodes++;
                    }
                });
                if (credit.numberOfEpisodes == 1){
                    getDataFromIMDb(credit.episodeName);
                } else {
                    credit.episodeName = '';
                }
                credit.voice = (credit.numberOfEpisodes && voiceEpisodes > 0.9*credit.numberOfEpisodes); //add Sprechrolle if more than 90 % are credited as voice
            } else {
                credit.voice = (entry.split('<br>').length > 1 && entry.split('<br>')[1].includes('voice')) || (entry.split('\n').length > 1 && entry.split('\n')[1].includes('voice'));
            }
            filmography.push(credit);
        });

        filmography = filmography.reverse().sort((a,b) => {
            return a.yearFrom - b.yearFrom;
        });

        function getItemFromWikidata(imdbid){
            request++;
            GM.xmlHttpRequest({
                method: 'GET',
                url: 'https://www.wikidata.org/w/api.php?action=query&format=json&list=search&srsearch=haswbstatement:P345=' + imdbid,
                onload: function(response){
                    done++;
                    if (response.responseText.length > 0){
                        var jsonObj = JSON.parse(response.responseText);
                        var credit = filmography.find(c => {
                            return c.imdbid == imdbid || c.episodeid == imdbid;
                        });
                        if (jsonObj.query.searchinfo.totalhits > 0){
                            var wikidataid = jsonObj.query.search[0].title;
                            if (credit.imdbid == imdbid){
                                credit.link = wikidataid;
                            } else {
                                credit.episodeid = wikidataid;
                            }
                            getDataFromWikidata(wikidataid);
                        } else if (credit.imdbid == imdbid){
                            getDataFromEIDR(imdbid);
                        }
                    }
                },
                onerror: function(response){
                    done++;
                    console.log('Error in fetching contents: ' + response.responseText);
                }
            });
        }

        function getDataFromWikidata(wikidataid){
            request++;
            GM.xmlHttpRequest({
                method: 'GET',
                url: 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks|claims|labels&sitefilter=dewiki&ids=' + wikidataid,
                onload: function(response){
                    done++;
                    if (response.responseText.length > 0){
                        var jsonObj = Object.values(JSON.parse(response.responseText).entities)[0];
                        var credit = filmography.find(c => {
                            return c.link == wikidataid || c.episodeid == wikidataid;
                        });
                        if (credit.link == wikidataid){ //get dt, ot, link
                            if (typeof jsonObj.sitelinks.dewiki != 'undefined'){ //wikipedia article
                                credit.link = jsonObj.sitelinks.dewiki.title;
                            } else {
                                credit.link = '';
                            }
                            if (typeof jsonObj.labels.de != 'undefined'){ //wikidata label
                                credit.dt = jsonObj.labels.de.value;
                            }
                            if (typeof jsonObj.claims.P1476 != 'undefined'){ //check if OT of entity exists
                                credit.ot = jsonObj.claims.P1476[0].mainsnak.datavalue.value.text.replace(/'/g,'’');
                            } else {
                                getDataFromEIDR(credit.imdbid);//get OT
                            }
                        } else if (credit.episodeid == wikidataid){ //get episode name
                            if (typeof jsonObj.sitelinks.dewiki != 'undefined'){ //wikipedia article
                                var article = jsonObj.sitelinks.dewiki.title;
                                if (article.slice(-1) == ')'){
                                    article += `|${article.split(' (')[0]}`;
                                }
                                credit.episodeName += ` ''[[${article}]]''`;
                            } else if (typeof jsonObj.labels.de != 'undefined'){ //wikidata label
                                credit.episodeName += ` ''${jsonObj.labels.de.value}''`;
                            }
                        }
                    }
                },
                onerror: function(response){
                    done++;
                    console.log('Error in fetching contents: ' + response.responseText);
                }
            });
        }

        function getDataFromIMDb(imdbid){
            request++;
            GM.xmlHttpRequest({
                method: 'GET',
                url: 'https://www.imdb.com/title/' + imdbid,
                onload: function(response){
                    done++;
                    var htmlText = response.responseText;
                    if (htmlText.length > 0){
                        var credit = filmography.find(c => {
                            return c.imdbid == imdbid || c.episodeName == imdbid;
                        });
                        if (credit.imdbid == imdbid){ //get ot
                            var ot;
                            if (htmlText.indexOf('Original title: ') != -1){
                                ot = (/Original title: (.*?)<\/div/m).exec(htmlText)[1];
                            } else {
                                ot = (/<title>(.*?) \([^\(]*?<\/title>/m).exec(htmlText)[1];
                            }
                            var txt = document.createElement('textarea');
                            txt.innerHTML = ot;
                            ot = txt.value;
                            credit.ot = ot.replace('...', '…').replace(' - ', ' – ');
                        } else if (credit.episodeName == imdbid){ //get episode name
                            var episodeNumber = (/">S(\d+?)<!-- -->.<!-- -->E(\d+?)<\/div>/m).exec(htmlText);
                            if (episodeNumber !== null && episodeNumber.length == 3){
                                credit.episodeName = episodeNumber[1]+'x'+(episodeNumber[2].length == 1?'0':'')+episodeNumber[2];
                                credit.episodeid = imdbid;
                                getItemFromWikidata(imdbid);
                            } else {
                                credit.episodeName = '';
                            }
                        }
                    }
                },
                onerror: function(response){
                    done++;
                    console.log('Error in fetching contents: ' + response.responseText);
                }
            });
        }
        function getDataFromEIDR(imdbid){
            request++;
            GM.xmlHttpRequest({
                method: 'GET',
                url: 'https://resolve.eidr.org/EIDR/object/?altId=' + imdbid + '&altidType=IMDB',
                onload: function(response){
                    done++;
                    var htmlText = response.responseText;
                    if (htmlText.length > 0){
                        var parser = new DOMParser();
                        var xmlDoc = parser.parseFromString(htmlText, 'text/xml');
                        var credit = filmography.find(c => {
                            return c.imdbid == imdbid || c.episodeName == imdbid;
                        });
                        //get ot
                        if (htmlText.indexOf('ResourceName') != -1){
                            var ot = xmlDoc.querySelector('ResourceName').innerHTML;
                            credit.ot = ot.replace('&amp;', '&').replace('...', '…').replace(' - ', ' – ');
                        }
                        else
                        {
                            getDataFromIMDb(imdbid);
                        }
                    }
                },
                onerror: function(response){
                    done++;
                    console.log('Error in fetching contents: ' + response.responseText);
                }
            });
        }

        function Credit(){
            this.numberOfEpisodes = 0;
            this.episodeid = '';
            this.formatTitle = function(title = ''){
                return title.replace(/[-–:., \d’'!]/g, '').toLowerCase();
            };
            this.compareTitles = function(titleA,titleB){
                return this.formatTitle(titleA) == this.formatTitle(titleB);
            };
            this.getYearPart = function(){
                var currentYear = new Date().getFullYear();
                if (this.type.includes('serie') && this.numberOfEpisodes > 1 && (this.yearFrom == currentYear || (this.yearTo && this.yearTo == currentYear))){
                    return `seit ${this.yearFrom}`;
                }
                if (!this.yearTo || this.yearTo == this.yearFrom){
                    return this.yearFrom;
                }
                if (this.numberOfEpisodes == 2 && parseInt(this.yearFrom) + 1 != this.yearTo){
                    return `${this.yearFrom}, ${this.yearTo}`;
                }
                return `${this.yearFrom}–${this.yearTo}`;
            };
            this.getTitlePart = function(){
                if (!this.link){
                    return this.dt;
                }
                if (this.link.slice(-1) == ')'){
                    this.dt = this.link.split(' (')[0];
                    return `[[${this.link}|${this.dt}]]`;
                }
                this.dt = this.link;
                return `[[${this.link}]]`;
            };
            this.getDescriptionPart = function(){
                if (!this.compareTitles(this.ot, this.dt) && !this.type && !this.voice){
                    return ` ''(${this.ot})''`;
                }
                var descriptionPart = '';
                if (!this.compareTitles(this.ot, this.dt)){
                    descriptionPart += ` (''${this.ot}''`;
                }
                if (this.type){
                    descriptionPart += (descriptionPart?', ':' (') + this.type;
                }
                if (!`${this.getYearPart()}`.startsWith('seit')){
                    if (this.numberOfEpisodes > 1){
                        descriptionPart += `, ${this.numberOfEpisodes} ${episodeLabel}n`;
                    } else if (this.numberOfEpisodes && this.episodeName){
                        descriptionPart += `, ${episodeLabel} ${this.episodeName}`;
                    } else if (this.numberOfEpisodes){
                        descriptionPart += `, eine ${episodeLabel}`;
                    }
                }
                if (this.voice){
                    descriptionPart += (descriptionPart?', ':' (') + 'Sprechrolle';
                }
                descriptionPart += descriptionPart?')':'';
                return descriptionPart;
            };
            this.toString = function(){
                return `\n* ${this.getYearPart()}: ${this.getTitlePart()}${this.getDescriptionPart()}`;
            };
        }
        return new Promise(resolve => {
            var checkIfCompleted = setInterval(() => {
                if (request === 0 || (done/request) != 1){
                    console.log('requests:',done,'/',request);
                } else {
                    var formattedFilmography = '== Filmografie ==';
                    filmography.forEach(entry => {
                        formattedFilmography += entry.toString();
                    });
                    GM.setClipboard(formattedFilmography);
                    var successMessage = 'Filmografie wurde erfolgreich kopiert.';
                    if (showAlert){
                        alert(successMessage);
                    } else {
                        //console.log(formattedFilmography);
                        console.log(successMessage);
                    }
                    clearInterval(checkIfCompleted);
                    resolve(formattedFilmography);
                }
            }, 1000);
        });
    }
    async function getArticleFromSPARQL(wikidataId){
        var personSparqlRequest = `SELECT DISTINCT ?source WHERE {
  #lade Person
  BIND(wd:${wikidataId} AS ?item)
  #Name/Label
  OPTIONAL {
    ?item rdfs:label ?name.
    FILTER((LANG(?name)) = "de")
  }
  #Alternativnamen
  OPTIONAL {
    SELECT ?item (GROUP_CONCAT(DISTINCT ?aliasText; SEPARATOR = "; ") AS ?alias) WHERE {
      ?item skos:altLabel ?aliasDe.
      FILTER((LANG(?aliasDe)) = "de")
      BIND(COALESCE(REPLACE(?aliasDe, "(.*) (.*)", "$2, $1"), "") AS ?aliasText)
    }
    GROUP BY ?item
  }
  #Name/enLabel
  OPTIONAL {
    ?item rdfs:label ?nameEn.
    FILTER((LANG(?nameEn)) = "en")
  }
  #falls kein deutsches Label, nutze englisches
  BIND(COALESCE(?name, ?nameEn) AS ?name)
  #beschreibung
  OPTIONAL {
    ?item schema:description ?description.
    FILTER((LANG(?description)) = "de")
  }
  #Geschlecht
  ?item wdt:P21 ?sx.
  #Bild
  OPTIONAL { ?item wdt:P18 ?image. }
  #Dateiname, Dateibeschreibung inklusive Jahr
  BIND(COALESCE(CONCAT("[[Datei:", REPLACE(wikibase:decodeUri(STR(?image)), ".*/", ""), "|mini|", ?name, IF(REGEX(wikibase:decodeUri(STR(?image)), "[1-2]\\d\\d\\d"), CONCAT(" (", REPLACE(wikibase:decodeUri(STR(?image)), ".*?([1-2]\\d\\d\\d).*", "$1"), ")"), ""), "]]\\n"), "") AS ?imagePart)
  #Commons-Link
  OPTIONAL { ?item wdt:P373 ?commons. }
  BIND(COALESCE(CONCAT("{{Commonscat", IF(?commons = (STR(?name)), "", CONCAT("|", ?commons, "|", ?name)), "}}\\n"), "") AS ?commonscat)
  #IMDb
  OPTIONAL { ?item wdt:P345 ?imdb. }
  #bekannt für
  OPTIONAL {
    SELECT ?item (GROUP_CONCAT(DISTINCT ?knownText; SEPARATOR = "° ") AS ?knowns) WHERE {
      ?item wdt:P800 ?known.
      ?known rdfs:label ?knownDe.
      FILTER((LANG(?knownDe)) = "de")
      #Wikilink
      OPTIONAL {
        _:t1 schema:about ?known;
             schema:isPartOf <https://de.wikipedia.org/>;
             schema:name ?knownWP.
      }
      BIND(COALESCE(CONCAT("''[[", ?knownWP, IF(?knownWP = ?knownDe, "", CONCAT("|", ?knownDe)), "]]''"), ?knownDe) AS ?knownText)
    }
    GROUP BY ?item
  }
  #Land
  OPTIONAL {
    SELECT ?item (GROUP_CONCAT(DISTINCT ?citizenWP; SEPARATOR = "° ") AS ?citizens) (GROUP_CONCAT(DISTINCT ?countryCatText; SEPARATOR = " ") AS ?countryCats) WHERE {
      ?item wdt:P27 ?country.
      ?country wdt:P1792 _:t2.
      _:t2 rdfs:label ?countryCat.
      FILTER((LANG(?countryCat)) = "de")
      BIND(COALESCE(CONCAT("\\n[[", ?countryCat, "]]"), "") AS ?countryCatText)
      OPTIONAL {
        ?item wdt:P21 ?sx.
        ?citizen p:P31 _:t3.
        _:t3 ps:P31 wd:Q33829;
             pq:P642 ?country.
        ?citizen rdfs:label ?citizenDe.
        FILTER((LANG(?citizenDe)) = "de")
        BIND(CONCAT(REPLACE(REPLACE(REPLACE(REPLACE(LCASE(?citizenDe), "(.*)..", "$1ische"), "^us-", "US-"), "iische$", "ische"), "scische$", "sche"), IF(?sx = wd:Q6581097, "r", "")) AS ?citizenText)
        OPTIONAL {
          _:t4 schema:about ?country;
               schema:isPartOf <https://de.wikipedia.org/>;
               schema:name ?countryWP.
        }
        BIND(CONCAT("[[", ?countryWP, "|", ?citizenText, "]]") AS ?citizenWP)
      }
    }
    GROUP BY ?item
  }
  #Geburtsort
  OPTIONAL {
    ?item wdt:P19 ?bPlace.
    ?bPlace rdfs:label ?bPlaceDe.
    FILTER((LANG(?bPlaceDe)) = "de")
    OPTIONAL {
      _:t5 schema:about ?bPlace;
           schema:isPartOf <https://de.wikipedia.org/>;
           schema:name ?bPlaceWP.
    }
    BIND(COALESCE(CONCAT("[[", IF(?bPlaceWP = ?bPlaceDe, ?bPlaceWP, CONCAT(?bPlaceWP, "|", ?bPlaceDe)), "]]"), ?bPlaceDe) AS ?bPlaceText)
    OPTIONAL {
      ?bPlace (wdt:P131+) ?bState.
      ?bState wdt:P31 wd:Q35657;
              rdfs:label ?bStateDe.
      FILTER((LANG(?bStateDe)) = "de")
      OPTIONAL {
        _:t6 schema:about ?bState;
             schema:isPartOf <https://de.wikipedia.org/>;
             schema:name ?bStateWP.
      }
      BIND(COALESCE(CONCAT("[[", IF(?bStateWP = ?bStateDe, ?bStateWP, CONCAT(?bStateWP, "|", ?bStateDe)), "]]"), ?bStateDe) AS ?bStateText)
    }
  }
  #Helfer Geburtsdatum
  OPTIONAL {
    ?item wdt:P569 ?bDate.
    BIND(MONTH(?bDate) AS ?bM)
    VALUES (?bM ?bMonth) {
      (1  "Januar")
      (2  "Februar")
      (3  "März")
      (4  "April")
      (5  "Mai")
      (6  "Juni")
      (7  "Juli")
      (8  "August")
      (9  "September")
      (10  "Oktober")
      (11  "November")
      (12  "Dezember")
    }
  }
  #Sterbeort
  OPTIONAL {
    ?item wdt:P20 ?dPlace.
    ?dPlace rdfs:label ?dPlaceDe.
    FILTER((LANG(?dPlaceDe)) = "de")
    OPTIONAL {
      _:t7 schema:about ?dPlace;
           schema:isPartOf <https://de.wikipedia.org/>;
           schema:name ?dPlaceWP.
    }
    BIND(COALESCE(CONCAT("[[", IF(?dPlaceWP = ?dPlaceDe, ?dPlaceWP, CONCAT(?dPlaceWP, "|", ?dPlaceDe)), "]]"), ?dPlaceDe) AS ?dPlaceText)
    OPTIONAL {
      ?dPlace (wdt:P131+) ?dState.
      ?dState wdt:P31 wd:Q35657;
              rdfs:label ?dStateDe.
      FILTER((LANG(?dStateDe)) = "de")
      OPTIONAL {
        _:t8 schema:about ?dState;
             schema:isPartOf <https://de.wikipedia.org/>;
             schema:name ?dStateWP.
      }
      BIND(COALESCE(CONCAT("[[", IF(?dStateWP = ?dStateDe, ?dStateWP, CONCAT(?dStateWP, "|", ?dStateDe)), "]]"), ?dStateDe) AS ?dStateText)
    }
  }
  #Helfer Sterbedatum
  OPTIONAL {
    ?item wdt:P570 ?dDate.
    BIND(MONTH(?dDate) AS ?dM)
    VALUES (?dM ?dMonth) {
      (1  "Januar")
      (2  "Februar")
      (3  "März")
      (4  "April")
      (5  "Mai")
      (6  "Juni")
      (7  "Juli")
      (8  "August")
      (9  "September")
      (10  "Oktober")
      (11  "November")
      (12  "Dezember")
    }
  }
  #Arbeit, Arbeitskategorien
  OPTIONAL {
    SELECT ?item (GROUP_CONCAT(DISTINCT ?workText; SEPARATOR = "° ") AS ?works) (GROUP_CONCAT(DISTINCT ?workCatText; SEPARATOR = " ") AS ?workCats) WHERE {
      ?item wdt:P106 ?work;
            wdt:P21 ?sx.
      ?work rdfs:label ?workDe.
      FILTER((LANG(?workDe)) = "de")
      OPTIONAL {
        ?work wdt:P910 _:t9.
        _:t9 rdfs:label ?workCat.
        FILTER((LANG(?workCat)) = "de")
      }
      BIND(COALESCE(CONCAT("\\n[[", ?workCat, "]]"), "") AS ?workCatText)
      OPTIONAL {
        _:t10 schema:about ?work;
              schema:isPartOf <https://de.wikipedia.org/>;
              schema:name ?workWP.
      }
      BIND(COALESCE(IF(?workWP = ?workDe, CONCAT("[[", ?workWP, "]]", IF(?sx = wd:Q6581097, "", "in")), CONCAT("[[", ?workWP, "|", ?workDe, IF(?sx = wd:Q6581097, "", "in"), "]]")), CONCAT(?workDe, IF(?sx = wd:Q6581097, "", "in"))) AS ?workText)
    }
    GROUP BY ?item
  }
  #besuchte, Uni-Kategorie
  OPTIONAL {
    SELECT DISTINCT ?item (GROUP_CONCAT(DISTINCT ?schoolText; SEPARATOR = "° ") AS ?schools) (GROUP_CONCAT(DISTINCT ?schoolCats; SEPARATOR = "\\n") AS ?schoolCatPart) WHERE {
      SELECT ?item ?schoolStart ?schoolEnd ?schoolText (GROUP_CONCAT(DISTINCT ?schoolCatText; SEPARATOR = " ") AS ?schoolCats) WHERE {
        ?item p:P69 ?pSchool.
        ?pSchool ps:P69 ?school.
        OPTIONAL {
          ?school rdfs:label ?schoolDe.
          FILTER((LANG(?schoolDe)) = "de")
        }
        OPTIONAL {
          ?school rdfs:label ?schoolEn.
          FILTER((LANG(?schoolEn)) = "en")
        }
        OPTIONAL {
          ?school wdt:P3876 _:t11.
          _:t11 rdfs:label ?schoolCat.
          FILTER((LANG(?schoolCat)) = "de")
        }
        BIND(COALESCE(CONCAT("\\n[[", ?schoolCat, "]]"), "") AS ?schoolCatText)
        OPTIONAL {
          _:t12 schema:about ?school;
                schema:isPartOf <https://de.wikipedia.org/>;
                schema:name ?schoolWP.
        }
        OPTIONAL { ?pSchool pq:P580 ?schoolStart. }
        OPTIONAL { ?pSchool pq:P582 ?schoolEnd. }
        BIND(CONCAT(COALESCE(CONCAT(IF(BOUND(?schoolEnd), "von ", "ab "), STR(YEAR(?schoolStart))), ""), COALESCE(CONCAT(" bis ", STR(YEAR(?schoolEnd))), ""), IF(REGEX(COALESCE(?schoolDe, ?schoolEn), "(ollege|nstitue)$"), " das ", " die "), COALESCE(IF(?schoolWP = ?schoolDe, CONCAT("[[", ?schoolWP, "]]"), CONCAT("[[", ?schoolWP, "|", ?schoolDe, "]]")), COALESCE(?schoolDe, ?schoolEn))) AS ?schoolText)
      }
      GROUP BY ?item ?schoolStart ?schoolEnd ?schoolText
                     ORDER BY DESC (?schoolEnd) DESC (?schoolStart)
    }
    GROUP BY ?item
  }
  #GND
  OPTIONAL { ?item wdt:P227 ?gnd. }
  #VIAF
  OPTIONAL { ?item wdt:P214 ?viaf. }
  #LCCN
  OPTIONAL { ?item wdt:P244 ?lccn. }
  #Kinder
  OPTIONAL {
    ?item wdt:P1971 ?kids.
    VALUES (?nr ?kidsText) {
      (1  "ein")
      (2  "zwei")
      (3  "drei")
      (4  "vier")
      (5  "fünf")
      (6  "sechs")
      (7  "sieben")
      (8  "acht")
      (9  "neun")
      (10  "zehn")
    }
    FILTER(?kids = ?nr)
  }
  #Wohnort
  OPTIONAL {
    SELECT ?item (GROUP_CONCAT(DISTINCT ?lPlaceText; SEPARATOR = "° ") AS ?lPlaces) WHERE {
      ?item wdt:P551 ?lPlace.
      ?lPlace rdfs:label ?lPlaceDe.
      FILTER((LANG(?lPlaceDe)) = "de")
      OPTIONAL {
        _:t13 schema:about ?lPlace;
              schema:isPartOf <https://de.wikipedia.org/>;
              schema:name ?lPlaceWP.
      }
      BIND(COALESCE(IF(?lPlaceWP = ?lPlaceDe, CONCAT("[[", ?lPlaceWP, "]]"), CONCAT("[[", ?lPlaceWP, "|", ?lPlaceDe, "]]")), ?lPlaceDe) AS ?lPlaceText)
    }
    GROUP BY ?item
  }
  #Ehepartner
  OPTIONAL {
    SELECT DISTINCT ?item (GROUP_CONCAT(DISTINCT ?spouseText; SEPARATOR = "° ") AS ?spouses) WHERE {
      SELECT ?item ?spouseStart ?spouseEnd ?spouseText WHERE {
        ?item p:P26 ?pSpouse.
        ?pSpouse ps:P26 ?spouse.
        ?spouse rdfs:label ?spouseDe.
        FILTER((LANG(?spouseDe)) = "de")
        ?spouse rdfs:label ?spouseEn.
        FILTER((LANG(?spouseEn)) = "en")
        OPTIONAL {
          _:t14 schema:about ?spouse;
                schema:isPartOf <https://de.wikipedia.org/>;
                schema:name ?spouseWP.
        }
        OPTIONAL { ?pSpouse pq:P580 ?spouseStart. }
        OPTIONAL { ?pSpouse pq:P582 ?spouseEnd. }
        BIND(CONCAT(COALESCE(CONCAT(IF(BOUND(?spouseEnd), "war von ", "ist seit "), STR(YEAR(?spouseStart))), ""), COALESCE(CONCAT(" bis ", STR(YEAR(?spouseEnd))), ""), " mit ", COALESCE(CONCAT("[[", ?spouseWP, IF(?spouseWP = ?spouseDe, "", CONCAT("|", ?spouseDe)), "]]"), COALESCE(?spouseDe, ?spouseEn))) AS ?spouseText)
      }
      GROUP BY ?item ?spouseStart ?spouseEnd ?spouseText
                     ORDER BY DESC (?spouseStart) DESC (?spouseEnd)
    }
    GROUP BY ?item
  }
  #Lebenspartner
  OPTIONAL {
    SELECT DISTINCT ?item (GROUP_CONCAT(DISTINCT ?partnerText; SEPARATOR = "° ") AS ?partners) WHERE {
      SELECT ?item ?partnerStart ?partnerEnd ?partnerText WHERE {
        ?item p:P451 ?pPartner.
        ?pPartner ps:P451 ?partner.
        ?partner rdfs:label ?partnerDe.
        FILTER((LANG(?partnerDe)) = "de")
        ?partner rdfs:label ?partnerEn.
        FILTER((LANG(?partnerEn)) = "en")
        OPTIONAL {
          _:t15 schema:about ?partner;
                schema:isPartOf <https://de.wikipedia.org/>;
                schema:name ?partnerWP.
        }
        OPTIONAL { ?pPartner pq:P580 ?partnerStart. }
        OPTIONAL { ?pPartner pq:P582 ?partnerEnd. }
        BIND(CONCAT(COALESCE(CONCAT(IF(BOUND(?partnerEnd), "war von ", "ist seit "), STR(YEAR(?partnerStart))), ""), COALESCE(CONCAT(" bis ", STR(YEAR(?partnerEnd))), ""), " mit ", COALESCE(CONCAT("[[", ?partnerWP, IF(?partnerWP = ?partnerDe, "", CONCAT("|", ?partnerDe)), "]]"), COALESCE(?partnerDe, ?partnerEn))) AS ?partnerText)
      }
      GROUP BY ?item ?partnerStart ?partnerEnd ?partnerText
                     ORDER BY DESC (?partnerStart) DESC (?partnerEnd)
    }
    GROUP BY ?item
  }
  BIND(CONCAT("'''", ?name, "'''") AS ?namePart)
  BIND(COALESCE(CONCAT(" (* [[", STR(DAY(?bDate)), ". ", ?bMonth, "]] [[", STR(YEAR(?bDate)), "]]", COALESCE(CONCAT(" in ", ?bPlaceText, COALESCE(CONCAT(", ", ?bStateText), "")), ""), COALESCE(CONCAT("; † [[", STR(DAY(?dDate)), ". ", ?dMonth, "]] [[", STR(YEAR(?dDate)), "]]", COALESCE(CONCAT(" in ", ?dPlaceText, COALESCE(CONCAT(", ", ?dStateText), "")), ""), ")"), ")")), "") AS ?dates)
  BIND(REPLACE(CONCAT(" ist ", IF(?sx = wd:Q6581097, "ein ", "eine "), COALESCE(CONCAT(?citizens, " ", REPLACE(?works, "° ([^°]*$)", " und $1")), ?description)), "° ", ", ") AS ?descriptionPart)
  BIND(REPLACE(COALESCE(CONCAT(IF(?sx = wd:Q6581097, ", der ", ", die "), "bekannt ist für ", REPLACE(?knowns, "° ([^°]*$)", " und $1")), ""), "° ", ", ") AS ?knownPart)
  BIND(IF((BOUND(?bPlace)) || (BOUND(?bDate)), CONCAT(?name, " wurde ", COALESCE(CONCAT(STR(YEAR(?bDate)), " "), ""), COALESCE(CONCAT("in ", ?bPlaceText), ""), COALESCE(CONCAT(", im US-Bundesstaat ", ?bStateText), ""), " geboren."), "") AS ?born)
  BIND(REPLACE(COALESCE(CONCAT(IF(?sx = wd:Q6581097, " Er", " Sie"), " besuchte ", REPLACE(?schools, "° ([^°]*$)", " und $1"), ". "), ""), "° ", ", ") AS ?education)
  BIND(REPLACE(CONCAT(REPLACE(?name, ".* (.*)", "\\n\\n$1 "), REPLACE(?partners, "° ([^°]*$)", " und $1"), " liiert. "), "(° war |° )", ", ") AS ?partnerPart)
  BIND(REPLACE(CONCAT(REPLACE(?name, ".* (.*)", "$1 "), REPLACE(?spouses, "° ([^°]*$)", " und $1"), " verheiratet"), "(° war |° )", ", ") AS ?spousePart)
  BIND(CONCAT(" hat ", ?kidsText, " Kind", IF(?kids = 1 , ".", "er.")) AS ?kidsPart)
  BIND(REPLACE(CONCAT(" ", IF(?sx = wd:Q6581097, "Er", "Sie"), " lebt in ", REPLACE(?lPlaces, "° ([^°]*$)", " und $1"), "."), "° ", ", ") AS ?lPlacesPart)
  BIND(IF((BOUND(?spousePart)) && (BOUND(?kidsPart)), " und", IF(BOUND(?spousePart), ". ", IF(BOUND(?kidsPart), IF(?sx = wd:Q6581097, "Er ", "Sie "), ""))) AS ?connection)
  BIND(CONCAT("\\n\\n== Weblinks ==\\n", ?commonscat, COALESCE(CONCAT("* {{IMDb|", ?imdb, "}}\\n"), "")) AS ?weblinks)
  BIND("\\n== Einzelnachweise ==\\n<references responsive />\\n" AS ?references)
  BIND(CONCAT("\\n{{Normdaten|TYP=p|GND=", COALESCE(?gnd, ""), "|LCCN=", COALESCE(?lccn, ""), "|VIAF=", COALESCE(?viaf, ""), IF(BOUND(?gnd), "", "|GNDfehlt=ja"), "|GNDCheck=", REPLACE(STR(NOW()),"T.*",""), "}}") AS ?normdata)
  BIND(CONCAT("\\n\\n{{SORTIERUNG:", REPLACE(REPLACE(?name, "(.*) (.*)", "$2, $1"), "\\\\.", ""), "}}") AS ?sortorder)
  BIND(CONCAT(COALESCE(CONCAT("\\n[[Kategorie:Geboren ", STR(YEAR(?bDate)), "]]"), ""), COALESCE(CONCAT("\\n[[Kategorie:Gestorben ", STR(YEAR(?dDate)), "]]"), ""), CONCAT("\\n[[Kategorie:", IF(?sx = wd:Q6581097, "Mann", "Frau"), "]]")) AS ?categories)
  BIND(CONCAT(COALESCE(?workCats, ""), COALESCE(?schoolCatPart, ""), COALESCE(?countryCats, ""), ?categories) AS ?cats)
  BIND(CONCAT("\\n\\n{{Personendaten", "\\n|NAME=", REPLACE(?name, "(.*) (.*)", "$2, $1"), "\\n|ALTERNATIVNAMEN=", COALESCE(?alias, ""), "\\n|KURZBESCHREIBUNG=", COALESCE(?description, REPLACE(CONCAT(?citizens, " ", REPLACE(?works, "° ([^°]*$)", " und $1")), "° ", ", ")), "\\n|GEBURTSDATUM=", COALESCE(CONCAT(STR(DAY(?bDate)), ". ", ?bMonth, " ", STR(YEAR(?bDate))), ""), "\\n|GEBURTSORT=", COALESCE(CONCAT(?bPlaceText, COALESCE(CONCAT(", ", ?bStateText), "")), ""), "\\n|STERBEDATUM=", COALESCE(CONCAT(STR(DAY(?dDate)), ". ", ?dMonth, " ", STR(YEAR(?dDate))), ""), "\\n|STERBEORT=", COALESCE(CONCAT(?dPlaceText, COALESCE(CONCAT(", ", ?dStateText), "")), ""), "\\n}}") AS ?persondata)
  BIND(CONCAT(?imagePart, ?namePart, ?dates, ?descriptionPart, ?knownPart, ".\\n\\n== Leben ==\\n", ?born, ?education, COALESCE(?partnerPart, "\\n\\n"), COALESCE(?spousePart, ""), ?connection, COALESCE(?kidsPart, ""), COALESCE(?lPlacesPart, ""), "\\n\\n{{FILMOGRAPHY}}\\n\\n", ?weblinks, ?references, ?normdata, ?sortorder, ?cats, ?persondata) AS ?source)
}`;
        var resp = await fetch("https://query.wikidata.org/sparql?format=json", {
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            },
            "body": "query=" + encodeURIComponent(personSparqlRequest).replaceAll("%20","+").replaceAll("%5Cd","%5C%5Cd"),
            "method": "POST",
            "mode": "cors"
        });
        var obj = await resp.json();
        return obj.results.bindings[0].source.value;
    }
})();