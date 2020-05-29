/* Magic Mirror
 * Module:  MMM-Flashcards
 *
 * By Hua KRUNG
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const path = require("path");
const url = require("url");
const fs = require("fs");
const exec = require("child_process").exec;
const os = require("os");
const bodyParser = require("body-parser");

var cardIdx={};

var session = {
	collectionName: "",
	id_collection: 0,
	flashcards:[],
	bucket : [],
	stats : [],
	history: [],
	current:{},
	nbBuckets: 0,
	step: 3,
} ;
var allCollections =[];
var allNames=[];
var range = [];
var maxRange = 0;

module.exports = NodeHelper.create({
	// Subclass start method.
	start: function() {
		var self = this;

		console.log("Starting node helper for: " + self.name);

		this.expressApp.get("/" + this.name + "/correct", (req, res) => {
			this.correctAnswer();
			res.send("Congratulations !");
		});

		this.expressApp.get("/" + this.name + "/wrong", (req, res) => {
			this.wrongAnswer();
			res.send("Too bad !");
		});

		this.expressApp.get("/" + this.name + "/check", (req, res) => {
			//TODO
		});

		this.expressApp.get("/" + this.name + "/prevCollection", (req, res) => {
			this.prevCollection();
			this.sendSocketNotification("FLASHCARDS_COLLLECTION_LOADED",allNames[session.id_collection]);
			session.current = this.pickFlashcard();
			var idF = session.bucket[session.current.level][session.current.idx];
			session.stats[idF]++;
			this.sendSocketNotification("FLASHCARDS_NEW",session.flashcards[idF]);
		});

		this.expressApp.get("/" + this.name + "/nextCollection", (req, res) => {
			this.nextCollection();
			this.sendSocketNotification("FLASHCARDS_COLLLECTION_LOADED",allNames[session.id_collection]);
			session.current = this.pickFlashcard();
			var idF = session.bucket[session.current.level][session.current.idx];
			session.stats[idF]++;
			this.sendSocketNotification("FLASHCARDS_NEW",session.flashcards[idF]);
		});
	},

	socketNotificationReceived: function(notification, payload) {
		if(notification === "FLASHCARDS_INIT") {
			this.initialize(payload);
			this.loadCollection(allNames[session.id_collection]);
			this.sendSocketNotification("FLASHCARDS_COLLLECTION_LOADED",allNames[session.id_collection]);
			session.current = this.pickFlashcard();
			var idF = session.bucket[session.current.level][session.current.idx];
			session.stats[idF]++;
			this.sendSocketNotification("FLASHCARDS_NEW",session.flashcards[idF]);

		} else if(notification === "FLASHCARDS_CORRECT") {
			this.correctAnswer();

		} else if(notification === "FLASHCARDS_WRONG") {
			this.wrongAnswer();

		} else if(notification === "FLASHCARDS_LOAD") {
			this.loadCollection(payload);
			session.current = this.pickFlashcard();
			var idF = session.bucket[session.current.level][session.current.idx];
			this.sendSocketNotification("FLASHCARDS_NEW",session.flashcards[idF]);

		} else if(notification === "FLASHCARDS_NEXTCOLLECTION"){
			this.nextCollection();
			this.sendSocketNotification("FLASHCARDS_COLLLECTION_LOADED",allNames[session.id_collection]);
			session.current = this.pickFlashcard();
			var idF = session.bucket[session.current.level][session.current.idx];
			session.stats[idF]++;
			this.sendSocketNotification("FLASHCARDS_NEW",session.flashcards[idF]);

		} else if(notification === "FLASHCARDS_PREVCOLLECTION"){
			this.prevCollection();
			this.sendSocketNotification("FLASHCARDS_COLLLECTION_LOADED",allNames[session.id_collection]);
			session.current = this.pickFlashcard();
			var idF = session.bucket[session.current.level][session.current.idx];
			session.stats[idF]++;
			this.sendSocketNotification("FLASHCARDS_NEW",session.flashcards[idF]);
		}
	},

	initialize: function(settings){
		for(var i=0;i<settings.topics.length;i++){
			allCollections[settings.topics[i].name] = settings.topics[i].cards;
		}
		allNames = Object.keys(allCollections);
		console.log("Initialize Flashcards: " + allNames.length + " collection(s) loaded");
		session.nbBuckets = settings.nbBuckets;
		session.id_collection = 0;
		session.step = settings.step>2?settings.step:2;

//		console.log("session: ",session);
	},

	loadCollection: function(collectionName){

		session.flashcards = allCollections[collectionName];
		console.log("Selected collection : "+ collectionName + " with " + session.flashcards.length + " flashcards.");
		session.bucket=[];
		for(i=0;i < session.nbBuckets;i++){
			session.bucket.push([]);
			range[i]=0;
		}
		session.bucket[0] = Object.keys(session.flashcards);
		session.stats=[];
		for(i=0;i < session.flashcards.length;i++){
			session.stats.push(0);
		}
		maxRange = this.resetRange();

	},
	nextCollection: function(){
		if(session.id_collection < allNames.length - 1) {
			session.id_collection++;
		} else {
			session.id_collection=0;
		}
		this.loadCollection(allNames[session.id_collection]);
		//this.sendSocketNotification("FLASHCARDS_LOAD",allNames[session.id_collection]);
	},

	prevCollection: function(){
		if(session.id_collection > 0) {
			session.id_collection--;
		} else {
			session.id_collection=allNames.length - 1;
		}
		this.loadCollection(allNames[session.id_collection]);
		//this.sendSocketNotification("FLASHCARDS_LOAD",allNames[session.id_collection]);
	},

	correctAnswer: function(){
//		console.log("Answer is correct !");
		this.levelUp();
		session.current = this.pickFlashcard();
		var idF = session.bucket[session.current.level][session.current.idx];
		session.stats[idF]++;
//		console.log("Flashcard id: ", idF);
		this.sendSocketNotification("FLASHCARDS_NEW",session.flashcards[idF]);
	},

	wrongAnswer: function(){
//		console.log("Answer is not correct !");
		this.levelDown();
		session.current = this.pickFlashcard();
		var idF = session.bucket[session.current.level][session.current.idx];
		session.stats[idF]++;
		//console.log("Flashcard id: ", idF);
		this.sendSocketNotification("FLASHCARDS_NEW",session.flashcards[idF]);
	},

	resetRange: function() {
		var mx = 0;
		for(i=0;i < session.nbBuckets;i++){
			mx += session.bucket[i].length>0?Math.pow(session.step,session.nbBuckets - (1 + i)):0;
			range[i] = mx;
		}
//		console.log("bucket:", session.bucket);
//		console.log("range:", range);
//		console.log("stats:", session.stats);
		return mx;
	},

	pickLevel: function(){
		var idx = Math.floor(Math.random() * maxRange );
		var level = -1;

		for(i=0;i < session.nbBuckets && level < 0;i++){
			if( idx < range[i]){
				level = i;
			}
		}
		return level;
	},

	/* pickFlashcard()
	 * Retrieve a random flashcard.
	 *
	 * return flashcard.
	 */
	pickFlashcard: function() {
//		console.log("Picking a new flashcard");
		var level = this.pickLevel();
		var idx = Math.floor(Math.random() * session.bucket[level].length);
		return {level: level, idx: idx};
	},

	levelUp: function(){
//		console.log("levelUp session.current ", session.current);
		session.current.idFlashcard = session.bucket[session.current.level][session.current.idx];
		session.current.newLevel = session.current.level;
		if((session.current.level + 1) < session.nbBuckets) {
			session.current.newLevel++;
			session.current.newLevel = session.current.level + 1;
			var flashcard = session.bucket[session.current.level].splice(session.current.idx,1);
			session.bucket[session.current.level+1].push(flashcard.pop());
			maxRange = this.resetRange();
		}
		session.history.push(session.current);

	},

	levelDown:  function(){
//		console.log("levelDown session.current ", session.current);
		session.current.idFlashcard = session.bucket[session.current.level][session.current.idx];
		var flashcard = session.bucket[session.current.level].splice(session.current.idx,1);
		session.current.newLevel = 0;
		session.bucket[0].push(flashcard.pop());
		maxRange = this.resetRange();

		/*
		session.current.newLevel = session.current.level;		
		if((session.current.level - 1) >= 0) {
			session.current.newLevel = 0;
			var flashcard = session.bucket[session.current.level].splice(session.current.idx,1);
			session.bucket[session.current.level-1].push(flashcard.pop());
			maxRange = this.resetRange();
		}*/

		session.history.push(session.current);
	},

});