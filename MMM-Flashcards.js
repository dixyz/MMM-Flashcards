/* Magic Mirror
 * Module: MMM-Flashcards
 *
 * By Hua KRUNG
 */
Module.register("MMM-Flashcards", {

	// Module config defaults.
	defaults: {
		header: "MMM-Flashcards",
		fadeSpeed: 1000,
		nbBuckets: 4,
		step: 3,
		topics: [
			{
				name: "Learning addition",
				cards: [
					{
						question: "1 + 1",
						answer: "2"
					},
					{
						question: "2 + 2",
						answer: "4"
					},

				]
			},

			{
				name: "French vocabulary",
				cards: [
					{
						question: "Apple",
						answer: "Pomme"
					},
					{
						question: "To learn",
						answer: "Apprendre"
					},
					{
						question: "Vocabulary",
						answer: "Vocabulaire"
					},

				]
			},
		],

	},
	keyBindings: {
		enabled: true,
		mode: "DEFAULT",
		map: {
			correct: "ArrowRight",
			wrong: "ArrowLeft",
			flip: "Home",
			prefTopic: "ArrowUp",
			nextTopic: "ArrowDown",
		}
	},
	settings:{},
	allNames:[],
	collection:"",
	flashcard:{question:"",answer:""},
	showAnswer:false,

	getStyles: function () {
		return ["MMM-Flashcards.css", "font-awesome.css"];
	},

	getHeader: function() {
		return this.config.header;
	},

	validKeyPress: function(kp) {
		if (kp.keyName === this.keyHandler.config.map.correct) {
			this.correctAnswer();
		} else if (kp.keyName === this.keyHandler.config.map.wrong) {
			this.wrongAnswer();
		} else if (kp.keyName == this.keyHandler.config.map.flip){
			this.showAnswer = !this.showAnswer;
			this.updateDom();
		} else if (kp.keyName == this.keyHandler.config.map.prefTopic){
			this.prefTopic();
		} else if (kp.keyName == this.keyHandler.config.map.nextTopic){
			this.nextTopic();
		}
	},
	hasFocus: function() {
		// Optional: Do something now that you have focus.
	},
	lostFocus: function() {
		// Optional: Do something now that you lost focus.
	},

	correctAnswer: function(){
		this.sendSocketNotification("FLASHCARDS_CORRECT",{});
	},

	wrongAnswer: function(){
		this.sendSocketNotification("FLASHCARDS_WRONG",{});
	},

	prefTopic: function(){
		this.sendSocketNotification("FLASHCARDS_PREVCOLLECTION",{});
	},
	nextTopic: function(){
		this.sendSocketNotification("FLASHCARDS_NEXTCOLLECTION",{});
	},

	// Define start sequence.
	start: function() {
		var self = this;
		this.settings.nbBuckets = this.config.nbBuckets;
		this.settings.step = this.config.nbBuckets;
		this.settings.topics = this.config.topics;
		this.settings.collections = this.config.collections;
		this.sendSocketNotification("FLASHCARDS_INIT",this.settings);
	},

	// Override dom generator.
	getDom: function() {
		var container = document.createElement("div");
		container.className = "flashcard";
		var headerC = document.createElement("div");
		headerC.className = "collection";
		var header = document.createElement("p");
		header.appendChild(document.createTextNode(this.collection));
		headerC.appendChild(header);
		container.appendChild(headerC);

		var flashcard = document.createElement("div");
		flashcard.setAttribute("id","myFlashcard");
		//		flashcard.className="flip-card";
		flashcard.className=this.showAnswer?"flip-container flip":"flip-container";
		var inner = document.createElement("div");
		//inner.className="flip-card-inner";
		inner.className="flipper";
		var front = document.createElement("div");
		front.className = "front";
		var back = document.createElement("div");
		//back.className = "flip-card-back";
		back.className = "back";

		var frontIcon = document.createElement("i");
		frontIcon.className = "fas fa-question-circle";
		var question = document.createElement("p");
		question.appendChild(document.createTextNode(this.flashcard.question));
		front.appendChild(frontIcon);
		front.appendChild(question);

		var backIcon = document.createElement("i");
		backIcon.className = "fas fa-search";
		var answer = document.createElement("p");
		answer.appendChild(document.createTextNode(this.flashcard.answer));
		back.appendChild(backIcon);
		back.appendChild(answer);

		inner.appendChild(front);
		inner.appendChild(back);
		flashcard.appendChild(inner);

		container.appendChild(flashcard);

		return container;
	},

	socketNotificationReceived: function(notification, payload) {
		if(notification === "FLASHCARDS_NEW"){
			this.flashcard = payload;
			this.showAnswer = false;
			this.updateDom(self.config.fadeSpeed);
		} else if(notification === "FLASHCARDS_COLLLECTION_LOADED"){
			this.collection = payload;
			this.showAnswer = false;
			this.updateDom(self.config.fadeSpeed);
		}
	},

	notificationReceived: function(notification, payload){
		if (notification === "MODULE_DOM_CREATED") {
			// First combine our configs,
			this.keyBindings = Object.assign({}, this.keyBindings, this.config.keyBindings);
			// Register Key Handler
			if (this.keyBindings.enabled && MM.getModules().filter(kb => kb.name === "MMM-KeyBindings").length > 0) {
				// Then, register the handler definition,
				KeyHandler.register(this.name, {
					sendNotification: (n, p) => { this.sendNotification(n,p); }, // Reference to send notifications
					validKeyPress: (kp) => { this.validKeyPress(kp); }, // Your Key Press Function
					onFocus: () => { this.hasFocus(); }, // Do something when you get focus
					onFocusReleased: () => { this.lostFocus(); } // Do something when focus is lost
				});
				// Finally, create the handler.
				this.keyHandler = KeyHandler.create(this.name, this.keyBindings);
			}
		}
		// For all future notifications, check if it is a key press and if we should worry about it.
		if (this.keyHandler && this.keyHandler.validate(notification, payload)) {
			return;
		}
	},

});
