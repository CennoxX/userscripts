// ==UserScript==
// @name         Filmografie von IMDb nach Wikipedia
// @version      2.2.7
// @description  Wandelt die Filmografie von IMDb mithilfe von Wikidata in Wikipedia-Quelltext um
// @author       CennoxX
// @namespace    https://greasyfork.org/users/21515
// @homepage     https://github.com/CennoxX/userscripts
// @supportURL   https://github.com/CennoxX/userscripts/issues/new?title=[Filmografie%20von%20IMDb%20nach%20Wikipedia]%20
// @connect      www.wikidata.org
// @connect      www.imdb.com
// @connect      resolve.eidr.org
// @match        https://www.imdb.com/name/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wikipedia.org
// @grant        GM.xmlHttpRequest
// @grant        GM.setClipboard
// @grant        GM.registerMenuCommand
// @grant        unsafeWindow
// @license      MIT
// @noframes
// ==/UserScript==
/* jshint esversion: 10 */
/* eslint quotes: ['warn', 'single', {'avoidEscape': true}] */
/* eslint curly: 'off' */

(function(){
    'use strict';
    unsafeWindow.ladeFilmografie = function(occupation='actor,#filmo-head-actress', showShort=true, episodeLabel='Folge', showAlert=false){
        var workSection = document.querySelector('#filmo-head-' + occupation);
        if (!workSection){
            alert('Keine Schauspiel-Filmografie vorhanden. Lädt stattdessen ersten möglichen Filmografie-Abschnitt.');
            workSection = document.querySelector('#filmography').firstElementChild;
        }
        var work = workSection.nextElementSibling.children;
        var filmography = [];
        var request = 0;
        var done = 0;
        [...document.links].forEach(link => {
            if (link.innerText.startsWith('Show all')){
                link.click();
            }
        });
        setTimeout(() => {
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
                if (!showShort && credit.type.includes('Kurzfilm')){
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

            var checkIfCompleted = setInterval(() => {
                console.clear();
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
                        console.log(formattedFilmography);
                        console.log(successMessage);
                    }
                    clearInterval(checkIfCompleted);
                }
            }, 1000);

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
        }, 3000);
        return 'Filmografie lädt …';
    };

    GM.registerMenuCommand('Filmografie laden',() => {
        unsafeWindow.ladeFilmografie(undefined, undefined, undefined, true);
    },'f');

    console.log('Um die Filmografie mit Standardeinstellungen zu laden, genügt ein Klick im Menü des Userscripts auf "Filmografie laden".\n'+
                'Die Filmografie kann in der Console mit erweiterten Einstellungen in der Form "ladeFilmografie(occupation, showShort, episodeLabel);" aufgerufen werden.\n'+
                'Dabei steht "episodeLabel" für die verwendete Bezeichnung "Folge" oder "Episode" und "showShort" dafür, ob Kurzfilme aufgeführt werden sollen oder nicht (true oder false).\n'+
                'Mit "occupation" können andere Filmografien als Schauspiel-Filmografien ausgegeben werden, dazu ist zum Beispiel "writer", "director" oder "producer" anzugeben.');
})();
