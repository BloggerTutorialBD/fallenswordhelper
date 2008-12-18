// ==UserScript==
// @name           SigmaStormHelper
// @namespace      terrasoft.gr
// @description    Sigma Storm Helper
// @include        http://www.sigmastorm2.com/*
// @include        http://sigmastorm2.com/*
// @include        http://*.sigmastorm2.com/*
// @exclude        http://forum.sigmastorm2.com/*
// @exclude        http://wiki.sigmastorm2.com/*
// @require        json2.js
// @require        calfSystem.js
// @require        ssLayout.js
// @require        ssData.js
// ==/UserScript==

// No warranty expressed or implied. Use at your own risk.

var Helper = {
	// System functions
	init: function(e) {
		Helper.initSettings();
		Helper.beginAutoUpdate();
		Helper.readInfo();
		this.initialized = true;
	},

	initSettings: function() {
		calfSystem.setDefault("enableLogColoring", true);
		calfSystem.setDefault("showCombatLog", true);
		calfSystem.setDefault("showCreatureInfo", true);
		calfSystem.setDefault("keepLogs", false);
		calfSystem.setDefault("showDebugInfo", false);
		calfSystem.setDefault("showCompletedQuests", true);
		calfSystem.setDefault("showExtraLinks", true);
		calfSystem.setDefault("huntingBuffs", "Doubler,Librarian,Adept Learner,Merchant,Treasure Hunter,Animal Magnetism,Conserve");
		calfSystem.setDefault("showHuntingBuffs", true);
		calfSystem.setDefault("moveFSBox", false);
		calfSystem.setDefault("hideNewBox", false);

		calfSystem.setDefault("guildSelf", "");
		calfSystem.setDefault("guildFrnd", "");
		calfSystem.setDefault("guildPast", "");
		calfSystem.setDefault("guildEnmy", "");
		calfSystem.setDefault("guildSelfMessage", "green|Member of your own guild");
		calfSystem.setDefault("guildFrndMessage", "yellow|Do not attack - Guild is friendly!");
		calfSystem.setDefault("guildPastMessage", "gray|Do not attack - You've been in that guild once!");
		calfSystem.setDefault("guildEnmyMessage", "red|Enemy guild. Attack at will!");
		calfSystem.setDefault("killAllAdvanced", "off");
		calfSystem.setDefault("showQuickKillOnWorld", true);
		calfSystem.setDefault("hideKrulPortal", false);
		calfSystem.setDefault("hideQuests", false);
		calfSystem.setDefault("hideQuestNames", "");
		calfSystem.setDefault("hideRecipes", false);
		calfSystem.setDefault("hideRecipeNames", "");

		var imgurls = calfSystem.findNode("//img[contains(@src, '/skin/')]");
		if (!imgurls) return; //login screen or error loading etc.
		var idindex = imgurls.src.indexOf("/skin/");
		calfSystem.imageServer=imgurls.src.substr(0,idindex);
		calfSystem.server=document.location.protocol + "//" + document.location.host + "/";
		Helper.browserVersion=parseInt(navigator.userAgent.match(/Firefox\/(\d+)/i)[1]);
		Helper.debug = GM_getValue("showDebugInfo");
	},

	readInfo: function() {
		var charInfo = calfSystem.findNode("//img[contains(@src,'skin/icon_player.gif')]");
		if (!charInfo) {return;}
		var charInfoText = charInfo.getAttribute("onmouseover");
		Helper.characterName = charInfoText.match(/Name:\s*<\/td><td width=\\\'90%\\\'>([0-9a-z]+)/i)[1];
		Helper.characterLevel = charInfoText.match(/Level:\s*<\/td><td width=\\\'90%\\\'>(\d+)/i)[1];
		Helper.characterAttack = charInfoText.match(/Attack:\s*<\/td><td width=\\\'90%\\\'>(\d+)/i)[1];
		Helper.characterDefense = charInfoText.match(/Defense:\s*<\/td><td width=\\\'90%\\\'>(\d+)/i)[1];
		Helper.characterHP = charInfoText.match(/HP:\s*<\/td><td width=\\\'90%\\\'>(\d+)/i)[1];
		Helper.characterArmor = charInfoText.match(/Armor:\s*<\/td><td width=\\\'90%\\\'>(\d+)/i)[1];
		Helper.characterDamage = charInfoText.match(/Damage:\s*<\/td><td width=\\\'90%\\\'>(\d+)/i)[1];
	},

	// Autoupdate
	beginAutoUpdate: function() {
		var lastCheck=GM_getValue("lastVersionCheck")
		var now=(new Date()).getTime();
		if (!lastCheck) lastCheck=0;
		var haveToCheck=((now - lastCheck) > 6*60*60*1000)
		if (haveToCheck) {
			Helper.checkForUpdate();
		}
	},

	checkForUpdate: function() {
		GM_log("Checking for new version...")
		var now=(new Date()).getTime();
		GM_setValue("lastVersionCheck", now.toString());
		GM_xmlhttpRequest({
			method: 'GET',
			url: "http://fallenswordhelper.googlecode.com/svn/trunk/?nonce="+now,
			headers: {
				"User-Agent" : navigator.userAgent,
				"Referer": document.location,
				"Cookie" : document.cookie
			},
			onload: function(responseDetails) {
				Helper.autoUpdate(responseDetails);
			},
		})
	},

	autoUpdate: function(responseDetails) {
		if (responseDetails.status!=200) return;
		var now=(new Date()).getTime()
		GM_setValue("lastVersionCheck", now.toString());
		var currentVersion=GM_getValue("currentVersion");
		if (!currentVersion) currentVersion=0;
		var versionRE=/Revision\s*([0-9]+):/;
		var latestVersion=responseDetails.responseText.match(versionRE)[1]
		GM_log("Current version:" + currentVersion);
		GM_log("Found version:" + latestVersion);
		if (currentVersion!=latestVersion) {
			if (window.confirm("New version (" + latestVersion + ") found. Update from version " + currentVersion + "?")) {
				GM_setValue("currentVersion", latestVersion)
				document.location="http://fallenswordhelper.googlecode.com/svn/trunk/sigmastormhelper.user.js";
			}
		}
	},

	// main event dispatcher
	onPageLoad: function(anEvent) {
		Helper.init();
		Layout.hideBanner();
		Layout.moveFSBox();
		Helper.prepareGuildList();
		Helper.prepareChat();
		Helper.injectStaminaCalculator();
		Helper.injectLevelupCalculator();
		Layout.injectMenu();
		Layout.hideNewBox();
		Helper.replaceKeyHandler();

		var re=/cmd=([a-z]+)/;
		var pageIdRE = re.exec(document.location.search);
		var pageId="-";
		if (pageIdRE)
			pageId=pageIdRE[1];

		re=/subcmd=([a-z]+)/;
		var subPageIdRE = re.exec(document.location.search);
		var subPageId="-";
		if (subPageIdRE)
			subPageId=subPageIdRE[1];

		re=/subcmd2=([a-z]+)/;
		var subPage2IdRE = re.exec(document.location.search);
		var subPage2Id="-";
		if (subPage2IdRE)
			subPage2Id=subPage2IdRE[1];

		re=/page=([0-9]+)/;
		var subsequentPageIdRE = re.exec(document.location.search);
		var subsequentPageId="-";
		if (subsequentPageIdRE)
			subsequentPageId=subsequentPageIdRE[1];

		Helper.page = pageId + "/" + subPageId + "/" + subPage2Id + "(" + subsequentPageId + ")"
		if (Helper.debug) GM_log(Helper.page);

		switch (pageId) {
		case "settings":
			Helper.injectSettings();
			break;
		case "world":
			switch (subPageId) {
			case "viewcreature":
				Helper.injectCreature();
				break;
			case "-":
				Helper.injectWorld();
			}
			break;
		case "blacksmith":
			switch (subPageId) {
			case "repairall":
				Helper.injectWorld();
				break;
			}
			break;
		case "questbook":
			switch(subsequentPageId) {
			case "-":
				Helper.injectQuestBookLite();
				break;
			}
			Helper.injectQuestBookFull();
			break;
		case "profile":
			switch (subPageId) {
			case "dropitems":
				Helper.injectDropItems();
				break;
			case "changebio":
				Helper.addBioWidgets();
				break;
			case "-":
				Helper.injectProfile();
			}
			break;
		case "auctionhouse":
			switch (subPageId) {
			case "create":
				break;
			case "preferences":
				break;
			default:
				Helper.injectAuctionHouse();
			}
			break;
		case "guild":
			switch(subPageId) {
			case "inventory":
				switch(subPage2Id) {
					case "report":
						Helper.injectReportPaint();
						break;
					default:
						Helper.injectDropItems();
				}
				break;
			case "chat":
				Helper.addLogColoring("Chat", 0);
				break;
			case "log":
				Helper.addLogColoring("GuildLog", 1);
				Helper.addGuildLogWidgets();
				break;
			case "groups":
				switch(subPage2Id) {
					case "viewstats":
						Helper.injectGroupStats();
						break;
					default:
						Helper.injectGroups();
				}
				break;
			case "manage":
				Helper.injectGuild();
				break;
			case "advisor":
				Helper.injectAdvisor();
				break;
			case "history":
				Helper.addHistoryWidgets();
				break;
			}
			break;
		case "bank":
			Helper.injectBank();
			break;
		case "log":
			switch (subPageId) {
			case "outbox":
				Helper.addLogColoring("OutBox", 1);
				break;
			case "-":
				Helper.addLogColoring("PlayerLog", 1);
				Helper.addLogWidgets();
				break;
			}
			break;
		case "marketplace":
			switch(subPageId) {
			case "createreq":
				Helper.addMarketplaceWidgets();
				break;
			}
			break;
		case "quickbuff":
			Helper.injectQuickBuff();
			break;
		case "notepad":
			switch(subPageId) {
			case "showlogs":
				Helper.injectNotepadShowLogs();
				break;
			case "invmanager":
				Helper.injectInventoryManager();
				break;
			case "guildinvmanager":
				Helper.injectGuildInventoryManager();
				break;
			case "recipemanager":
				Helper.injectRecipeManager();
				break;
			case "questmanager":
				Helper.injectQuestManager();
				break;
			}
			break;
		case "points":
			switch(subPageId) {
			case "-":
				Helper.storePlayerUpgrades();
				break;
			}
			break;
		case "toprated":
			switch(subPageId) {
			case "xp":
				Helper.injectTopRated();
				break;
			}
			break;
		case "inventing":
			switch(subPageId) {
			case "viewrecipe":
				Helper.injectViewRecipe();
				break;
			}
			break;
		case "-":
			var isRelicPage = calfSystem.findNode("//input[contains(@title,'Use your current group to capture the relic')]");
			if (isRelicPage) {
				Helper.injectRelic(isRelicPage);
			}
			var isAuctionPage = calfSystem.findNode("//img[contains(@title,'Auction House')]");
			if (isAuctionPage) {
				Helper.injectAuctionHouse();
			}
			var isQuestBookPage = calfSystem.findNode("//td[.='Quest Name']");
			if (isQuestBookPage) {
				Helper.injectQuestBookFull();
			}
			var isAdvisorPageClue1 = calfSystem.findNode("//font[@size=2 and .='Advisor']");
			var clue2 = "//a[@href='index.php?cmd=guild&amp;subcmd=manage' and .='Back to Guild Management']"
			var isAdvisorPageClue2 = calfSystem.findNode(clue2);
			if (isAdvisorPageClue1 && isAdvisorPageClue2) {
				Helper.injectAdvisor();
			}
			break;
		}
	},

	injectGuild: function() {
		var guildLogo = calfSystem.findNode("//a[contains(.,'Change Logo')]").parentNode;
		guildLogo.innerHTML += "[ <span style='cursor:pointer; text-decoration:underline;' " +
			"id='toggleGuildLogoControl' linkto='guildLogoControl'>X</span> ]";
		var guildLogoElement = calfSystem.findNode("//img[contains(@title, 's Logo')]");
		guildLogoElement.id = "guildLogoControl";
		if (GM_getValue("guildLogoControl")) {
			guildLogoElement.style.display = "none";
			guildLogoElement.style.visibility = "hidden";
		}
		var leaveGuild = calfSystem.findNode("//a[contains(.,'Leave')]").parentNode;
		leaveGuild.innerHTML += "[ <span style='cursor:pointer; text-decoration:underline;' " +
			"id='toggleStatisticsControl' linkto='statisticsControl'>X</span> ]";
		var linkElement=calfSystem.findNode("//a[@href='index.php?cmd=guild&subcmd=changefounder']");
		statisticsListElement = linkElement.parentNode.parentNode.parentNode.nextSibling.nextSibling.nextSibling.nextSibling.firstChild.nextSibling;
		statisticsListElement.innerHTML = "<span id='statisticsControl'>" + statisticsListElement.innerHTML + "</span>";
		if (GM_getValue("statisticsControl")) {
			var statisticsControl = document.getElementById("statisticsControl");
			statisticsControl.style.display = "none";
			statisticsControl.style.visibility = "hidden";
		}
		var build = calfSystem.findNode("//a[contains(.,'Build')]").parentNode;
		build.innerHTML += "[ <span style='cursor:pointer; text-decoration:underline;' " +
			"id='toggleGuildStructureControl' linkto='guildStructureControl'>X</span> ]";
		var linkElement=calfSystem.findNode("//a[@href='index.php?cmd=guild&subcmd=structures']");
		structureListElement = linkElement.parentNode.parentNode.parentNode.nextSibling.nextSibling.nextSibling.nextSibling.firstChild.nextSibling;
		structureListElement.innerHTML = "<span id='guildStructureControl'>" + structureListElement.innerHTML + "</span>";
		if (GM_getValue("guildStructureControl")) {
			var guildStructureControl = document.getElementById("guildStructureControl");
			guildStructureControl.style.display = "none";
			guildStructureControl.style.visibility = "hidden";
		}

		document.getElementById('toggleGuildLogoControl').addEventListener('click', Helper.toggleVisibilty, true);
		document.getElementById('toggleStatisticsControl').addEventListener('click', Helper.toggleVisibilty, true);
		document.getElementById('toggleGuildStructureControl').addEventListener('click', Helper.toggleVisibilty, true);
	},

	injectStaminaCalculator: function() {
		var staminaImageElement = calfSystem.findNode("//img[contains(@src,'/skin/icon_stamina.gif')]");
		if (!staminaImageElement) return;

		var mouseoverText = staminaImageElement.getAttribute("onmouseover");
		var staminaRE = /Stamina:\s<\/td><td width=\\'90%\\'>([,0-9]+)\s\/\s([,0-9]+)<\/td>/
		var curStamina = staminaRE.exec(mouseoverText)[1];
		curStamina = curStamina.replace(/,/,"")*1;
		var maxStamina = staminaRE.exec(mouseoverText)[2];
		maxStamina = maxStamina.replace(/,/,"")*1;
		var gainPerHourRE = /Gain\sPer\sHour:\s<\/td><td width=\\'90%\\'>\+([,0-9]+)<\/td>/
		var gainPerHour = gainPerHourRE.exec(mouseoverText)[1];
		gainPerHour = gainPerHour.replace(/,/,"")*1;
		var nextGainRE = /Next\sGain\s:\s<\/td><td width=\\'90%\\'>([,0-9]+)m/
		var nextGainMinutes = nextGainRE.exec(mouseoverText)[1];
		nextGainMinutes = nextGainMinutes.replace(/,/,"")*1;
		nextGainHours = nextGainMinutes/60;
		//get the max hours to still be inside stamina maximum
		var hoursToMaxStamina = Math.floor((maxStamina - curStamina)/gainPerHour);
		var millisecondsToMaxStamina = 1000*60*60*(hoursToMaxStamina + nextGainHours);
		var now = (new Date()).getTime();
		var nextHuntMilliseconds = (now + millisecondsToMaxStamina);

		var d = new Date(nextHuntMilliseconds);
		var nextHuntTimeText = d.toFormatString("HH:mm ddd dd/MMM/yyyy");
		var newPart = "<tr><td><font color=\\'#FFF380\\'>Max Stam At: </td><td width=\\'90%\\'>" +
			nextHuntTimeText + "</td></tr><tr>";
		var newMouseoverText = mouseoverText.replace("</table>", newPart + "</table>");
		//newMouseoverText = newMouseoverText.replace(/\s:/,":"); //this breaks the fallen sword addon, so removing this line.
		staminaImageElement.setAttribute("onmouseover", newMouseoverText);
	},

	injectLevelupCalculator: function() {
		var levelupImageElement = calfSystem.findNode("//img[contains(@src,'/skin/icon_xp.gif')]");
		if (!levelupImageElement) return;
		var mouseoverText = levelupImageElement.getAttribute("onmouseover");
		var remainingXPRE = /Remaining:\s<\/td><td width=\\\'90%\\\'>([0-9,]+)/i;
		var gainRE = /Gain\sPer\sHour:\s<\/td><td width=\\\'90%\\\'>\+([0-9,]+)/i;
		var nextGainRE = /Next\sGain\s*:\s*<\/td><td width=\\\'90%\\\'>([0-9]*)m\s*([0-9]*)s/i
		var remainingXP = parseInt(remainingXPRE.exec(mouseoverText)[1].replace(/,/g,""));
		var gain = parseInt(gainRE.exec(mouseoverText)[1].replace(/,/g,""));
		var nextGainMin = parseInt(nextGainRE.exec(mouseoverText)[1]);
		var nextGainSec = parseInt(nextGainRE.exec(mouseoverText)[1]);
		var hoursToNextLevel = Math.ceil(remainingXP/gain);
		var millisecsToNextGain = (hoursToNextLevel*60*60+nextGainMin*60+nextGainSec)*1000;

		var nextGainTime  = new Date((new Date()).getTime() + millisecsToNextGain);
		var mouseoverTextAddition = "<tr><td><font color=\\'#FFF380\\'>Next Level At: </td><td width=\\'90%\\'>" +
			nextGainTime.toFormatString("HH:mm ddd dd/MMM/yyyy") + "</td></tr><tr>";
		newMouseoverText = mouseoverText.replace("</table>", mouseoverTextAddition + "</table>");
		newMouseoverText = newMouseoverText.replace("tt_setWidth(175)", "tt_setWidth(200)");
		levelupImageElement.setAttribute("onmouseover", newMouseoverText);
		return;
	},


	injectRelic: function(isRelicPage) {
		var relicNameElement = calfSystem.findNode("//td[contains(.,'Below is the current status for the relic')]/b");
		relicNameElement.parentNode.style.fontSize = "x-small";
		var buttonElement = calfSystem.findNode("//input[@value='Attempt Group Capture']");
		var injectHere = buttonElement.parentNode;
		injectHere.align = 'center';
		injectHere.innerHTML = '<input id="calculatedefenderstats" type="button" value="Calculate Defender Stats" title="Calculate the stats of the players defending the relic." ' +
			'class="custombutton">' + injectHere.innerHTML;

		document.getElementById('calculatedefenderstats').addEventListener('click', Helper.calculateRelicDefenderStats, true);
	},

	calculateRelicDefenderStats: function(evt) {
		var calcButton = calfSystem.findNode("//input[@id='calculatedefenderstats']");
		calcButton.style.display = "none";
		var relicNameElement = calfSystem.findNode("//td[contains(.,'Below is the current status for the relic')]/b");
		relicNameElement.parentNode.style.fontSize = "x-small";
		var tableElement = calfSystem.findNode("//table[@width='600']");
		for (var i=0;i<tableElement.rows.length;i++) {
			var aRow = tableElement.rows[i];
			if (i==2 ||
				i==3 || //Relic picture
				i==4 ||
				i==5 || //back to world
				i==6 ||
				i==7 || //Relic instructions
				i==8 ||
				i==10 ||
				i==11) { // attempt group capture button
				aRow.firstChild.colSpan = '3';
			}
		}
		var relicName = relicNameElement.innerHTML;
		var tableWithBorderElement = calfSystem.findNode("//table[@cellpadding='5']");
		tableWithBorderElement.align = "left";
		tableWithBorderElement.parentNode.colSpan = "2";
		var tableInsertPoint = tableWithBorderElement.parentNode.parentNode;
		tableInsertPoint.innerHTML += "<td colspan='1'><table width='200' style='border:1px solid #A07720;'>" +
			"<tbody><tr><td title='InsertSpot'></td></tr></tbody></table></td>";
		var extraTextInsertPoint = calfSystem.findNode("//td[@title='InsertSpot']");
		var defendingGuild = calfSystem.findNode("//a[contains(@href,'index.php?cmd=guild&subcmd=view&guild_id=')]");
		var defendingGuildHref = defendingGuild.getAttribute("href");
		Helper.getRelicGuildData(extraTextInsertPoint,defendingGuildHref);

		//code specifically to see if guild members are guarding the relic - only applies to PANIC
		if (defendingGuildHref == "index.php?cmd=guild&subcmd=view&guild_id=40769") {
			var panicGuild = true;
		}
		var validMemberString = "";
		if (panicGuild) {
			var memberList = calfSystem.getValueJSON("memberlist");
			for (var i=0;i<memberList.members.length;i++) {
				var member=memberList.members[i];
				if (member.status == "Offline"
					&& (member.level < 400 || (member.level > 421 && member.level < 441 ) || member.level > 450)) {
					validMemberString += member.name + " ";
				}
			}
		}

		var listOfDefenders = calfSystem.findNodes("//b/a[contains(@href,'index.php?cmd=profile&player_id=')]");
		var defenderCount = 0;
		var testList = "";
		for (var i=0; i<listOfDefenders.length; i++) {
			var href = listOfDefenders[i].getAttribute("href");
			//if (i<3) { //I put this in to limit the number of calls this function makes.
					//I don't want to hammer the server too much.
				Helper.getRelicPlayerData(defenderCount,extraTextInsertPoint,href);
			//}
			testList += listOfDefenders[i].innerHTML + " ";
			validMemberString = validMemberString.replace(listOfDefenders[i].innerHTML + " ","");
			defenderCount++;
		}
		//extraTextInsertPoint.innerHTML += "<tr><td style='font-size:x-small;'>" + testList + "<td><tr>";
		extraTextInsertPoint.innerHTML += "<tr><td><table style='font-size:small; border-top:2px black solid;'>" +
			"<tr><td>Number of Defenders:</td><td>" + defenderCount + "</td></tr>" +
			"<tr><td>Defending Guild Relic Count:</td><td title='relicCount'>0</td></tr>" +
			"<tr><td>Lead Defender Bonus:</td><td title='LDPercentage'>0</td></tr>" +
			"<tr style='display:none;'><td>Relic Count Processed:</td><td title='relicProcessed'>0</td></tr>" +
			"<tr><td colspan='2' style='font-size:x-small; color:gray;'>Does not allow for last logged time (yet)</td></tr>" +
			"<tr style='display:none;'><td colspan='2' style='border-top:2px black solid;'>Lead Defender Full Stats</td></tr>" +
			"<tr style='display:none;'><td align='right' style='color:brown;'>Attack:</td><td align='right' title='LDattackValue'>0</td></tr>" +
			"<tr style='display:none;'><td align='right' style='color:brown;'>Defense:</td><td align='right' title='LDdefenseValue'>0</td></tr>" +
			"<tr style='display:none;'><td align='right' style='color:brown;'>Armor:</td><td align='right' title='LDarmorValue'>0</td></tr>" +
			"<tr style='display:none;'><td align='right' style='color:brown;'>Damage:</td><td align='right' title='LDdamageValue'>0</td></tr>" +
			"<tr style='display:none;'><td align='right' style='color:brown;'>HP:</td><td align='right' title='LDhpValue'>0</td></tr>" +
			"<tr style='display:none;'><td align='right' style='color:brown;'>Processed:</td><td align='right' title='LDProcessed'>0</td></tr>" +
			"<tr><td colspan='2' style='border-top:2px black solid;'>Other Defender Stats</td></tr>" +
			"<tr><td align='right' style='color:brown;'>Attack:</td><td align='right' title='attackValue'>0</td></tr>" +
			"<tr><td align='right' style='color:brown;'>Defense:</td><td align='right' title='defenseValue'>0</td></tr>" +
			"<tr><td align='right' style='color:brown;'>Armor:</td><td align='right' title='armorValue'>0</td></tr>" +
			"<tr><td align='right' style='color:brown;'>Damage:</td><td align='right' title='damageValue'>0</td></tr>" +
			"<tr><td align='right' style='color:brown;'>HP:</td><td align='right' title='hpValue'>0</td></tr>" +
			"<tr><td align='right' style='color:brown;'>Processed:</td><td align='right' title='defendersProcessed'>0</td></tr>"
		if (panicGuild) {
			extraTextInsertPoint.innerHTML += "<tr><td style='border-top:2px black solid;'>Offline guild members not at relic:<td><tr>";
			extraTextInsertPoint.innerHTML += "<tr><td style='font-size:x-small; color:red;'>" + validMemberString + "<td><tr>";
		}
		extraTextInsertPoint.innerHTML += "</table><td><tr>";
	},

	getRelicGuildData: function(extraTextInsertPoint,href) {
		calfSystem.xmlhttp(href, function(responseDetails) {Helper.parseRelicGuildData(extraTextInsertPoint,href, responseDetails.responseText);});
	},

	parseRelicGuildData: function(extraTextInsertPoint,href, responseText) {
		var doc=calfSystem.createDocument(responseText);
		var allItems = doc.getElementsByTagName("IMG");
		var relicCount = 0;
		for (var i=0;i<allItems.length-1;i++) {
			var anItem=allItems[i];
			var mouseoverText = anItem.getAttribute("onmouseover")
			if (mouseoverText && mouseoverText.search("Relic Bonuses") != -1){
				relicCount++;
			}
		}
		var relicCountValue = calfSystem.findNode("//td[@title='relicCount']");
		relicCountValue.innerHTML = relicCount;
		var relicProcessedValue = calfSystem.findNode("//td[@title='relicProcessed']");
		relicProcessedValue.innerHTML = 1;
		var relicMultiplier = 1;
		if (relicCount == 1) {
			relicMultiplier = 1.5;
		}
		else if (relicCount >= 3) {
			relicMultiplier = 0.9;
		}
		var LDProcessedValue = calfSystem.findNode("//td[@title='LDProcessed']");
		if (LDProcessedValue.innerHTML == "1") {
			var attackValue = calfSystem.findNode("//td[@title='attackValue']");
			var LDattackValue = calfSystem.findNode("//td[@title='LDattackValue']");
			attackNumber=attackValue.innerHTML.replace(/,/,"")*1;
			LDattackNumber=LDattackValue.innerHTML.replace(/,/,"")*1;
			attackValue.innerHTML = Helper.addCommas(attackNumber + Math.round(LDattackNumber*relicMultiplier));
			var defenseValue = calfSystem.findNode("//td[@title='defenseValue']");
			var LDdefenseValue = calfSystem.findNode("//td[@title='LDdefenseValue']");
			defenseNumber=defenseValue.innerHTML.replace(/,/,"")*1;
			LDdefenseNumber=LDdefenseValue.innerHTML.replace(/,/,"")*1;
			defenseValue.innerHTML = Helper.addCommas(defenseNumber + Math.round(LDdefenseNumber*relicMultiplier));
			var armorValue = calfSystem.findNode("//td[@title='armorValue']");
			var LDarmorValue = calfSystem.findNode("//td[@title='LDarmorValue']");
			armorNumber=armorValue.innerHTML.replace(/,/,"")*1;
			LDarmorNumber=LDarmorValue.innerHTML.replace(/,/,"")*1;
			armorValue.innerHTML = Helper.addCommas(armorNumber + Math.round(LDarmorNumber*relicMultiplier));
			var damageValue = calfSystem.findNode("//td[@title='damageValue']");
			var LDdamageValue = calfSystem.findNode("//td[@title='LDdamageValue']");
			damageNumber=damageValue.innerHTML.replace(/,/,"")*1;
			LDdamageNumber=LDdamageValue.innerHTML.replace(/,/,"")*1;
			damageValue.innerHTML = Helper.addCommas(damageNumber + Math.round(LDdamageNumber*relicMultiplier));
			var hpValue = calfSystem.findNode("//td[@title='hpValue']");
			var LDhpValue = calfSystem.findNode("//td[@title='LDhpValue']");
			hpNumber=hpValue.innerHTML.replace(/,/,"")*1;
			LDhpNumber=LDhpValue.innerHTML.replace(/,/,"")*1;
			hpValue.innerHTML = Helper.addCommas(hpNumber + Math.round(LDhpNumber*relicMultiplier));
			var defendersProcessed = calfSystem.findNode("//td[@title='defendersProcessed']");
			defendersProcessedNumber=defendersProcessed.innerHTML.replace(/,/,"")*1;
			defendersProcessed.innerHTML = Helper.addCommas(defendersProcessedNumber + 1);
			var LDpercentageValue = calfSystem.findNode("//td[@title='LDPercentage']");
			LDpercentageValue.innerHTML = (relicMultiplier*100) + "%";
		}
	},

	getRelicPlayerData: function(defenderCount,extraTextInsertPoint,href) {
		calfSystem.xmlhttp(href, function(responseDetails) {Helper.parseRelicPlayerData(defenderCount,extraTextInsertPoint,href, responseDetails.responseText);})
	},

	parseRelicPlayerData: function(defenderCount,extraTextInsertPoint,href, responseText) {
		var doc=calfSystem.createDocument(responseText)
		var allItems = doc.getElementsByTagName("B")
		for (var i=0;i<allItems.length;i++) {
			var anItem=allItems[i];
			if (anItem.innerHTML == "Attack:&nbsp;"){
				var attackText = anItem;
				var attackLocation = attackText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerAttackValue = attackLocation.textContent;
				var defenseText = attackText.parentNode.nextSibling.nextSibling.nextSibling.firstChild;
				var defenseLocation = defenseText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerDefenseValue = defenseLocation.textContent;
				var armorText = defenseText.parentNode.parentNode.nextSibling.nextSibling.firstChild.nextSibling.firstChild;
				var armorLocation = armorText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerArmorValue = armorLocation.textContent;
				var damageText = armorText.parentNode.nextSibling.nextSibling.nextSibling.firstChild;
				var damageLocation = damageText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerDamageValue = damageLocation.textContent;
				var hpText = damageText.parentNode.parentNode.nextSibling.nextSibling.firstChild.nextSibling.firstChild;
				var hpLocation = hpText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerHPValue = hpLocation.textContent;
			}
		}

		if (defenderCount != 0) {
			var defenderMultiplier = 0.2;
			var attackValue = calfSystem.findNode("//td[@title='attackValue']");
			attackNumber=attackValue.innerHTML.replace(/,/,"")*1;
			attackValue.innerHTML = Helper.addCommas(attackNumber + Math.round(playerAttackValue*defenderMultiplier));
			var defenseValue = calfSystem.findNode("//td[@title='defenseValue']");
			defenseNumber=defenseValue.innerHTML.replace(/,/,"")*1;
			defenseValue.innerHTML = Helper.addCommas(defenseNumber + Math.round(playerDefenseValue*defenderMultiplier));
			var armorValue = calfSystem.findNode("//td[@title='armorValue']");
			armorNumber=armorValue.innerHTML.replace(/,/,"")*1;
			armorValue.innerHTML = Helper.addCommas(armorNumber + Math.round(playerArmorValue*defenderMultiplier));
			var damageValue = calfSystem.findNode("//td[@title='damageValue']");
			damageNumber=damageValue.innerHTML.replace(/,/,"")*1;
			damageValue.innerHTML = Helper.addCommas(damageNumber + Math.round(playerDamageValue*defenderMultiplier));
			var hpValue = calfSystem.findNode("//td[@title='hpValue']");
			hpNumber=hpValue.innerHTML.replace(/,/,"")*1;
			hpValue.innerHTML = Helper.addCommas(hpNumber + Math.round(playerHPValue*defenderMultiplier));
			var defendersProcessed = calfSystem.findNode("//td[@title='defendersProcessed']");
			defendersProcessedNumber=defendersProcessed.innerHTML.replace(/,/,"")*1;
			defendersProcessed.innerHTML = Helper.addCommas(defendersProcessedNumber + 1);
		}
		else {
			var defenderMultiplier = 1;
			var attackValue = calfSystem.findNode("//td[@title='LDattackValue']");
			attackNumber=attackValue.innerHTML.replace(/,/,"")*1;
			attackValue.innerHTML = Helper.addCommas(attackNumber + Math.round(playerAttackValue*defenderMultiplier));
			var defenseValue = calfSystem.findNode("//td[@title='LDdefenseValue']");
			defenseNumber=defenseValue.innerHTML.replace(/,/,"")*1;
			defenseValue.innerHTML = Helper.addCommas(defenseNumber + Math.round(playerDefenseValue*defenderMultiplier));
			var armorValue = calfSystem.findNode("//td[@title='LDarmorValue']");
			armorNumber=armorValue.innerHTML.replace(/,/,"")*1;
			armorValue.innerHTML = Helper.addCommas(armorNumber + Math.round(playerArmorValue*defenderMultiplier));
			var damageValue = calfSystem.findNode("//td[@title='LDdamageValue']");
			damageNumber=damageValue.innerHTML.replace(/,/,"")*1;
			damageValue.innerHTML = Helper.addCommas(damageNumber + Math.round(playerDamageValue*defenderMultiplier));
			var hpValue = calfSystem.findNode("//td[@title='LDhpValue']");
			hpNumber=hpValue.innerHTML.replace(/,/,"")*1;
			hpValue.innerHTML = Helper.addCommas(hpNumber + Math.round(playerHPValue*defenderMultiplier));
			var defendersProcessed = calfSystem.findNode("//td[@title='LDProcessed']");
			defendersProcessedNumber=defendersProcessed.innerHTML.replace(/,/,"")*1;
			defendersProcessed.innerHTML = Helper.addCommas(defendersProcessedNumber + 1);
		}
		var relicProcessedValue = calfSystem.findNode("//td[@title='relicProcessed']");
		var relicCountValue = calfSystem.findNode("//td[@title='relicCount']");
		var relicCount = relicCountValue.innerHTML.replace(/,/,"")*1;

		var relicMultiplier = 1;
		if (relicCount == 1) {
			relicMultiplier = 1.5;
		}
		else if (relicCount >= 3) {
			relicMultiplier = 0.9;
		}

		if (defenderCount == 0 && relicProcessedValue.innerHTML == "1") {
			var attackValue = calfSystem.findNode("//td[@title='attackValue']");
			var LDattackValue = calfSystem.findNode("//td[@title='LDattackValue']");
			attackNumber=attackValue.innerHTML.replace(/,/,"")*1;
			LDattackNumber=LDattackValue.innerHTML.replace(/,/,"")*1;
			attackValue.innerHTML = Helper.addCommas(attackNumber + Math.round(LDattackNumber*relicMultiplier));
			var defenseValue = calfSystem.findNode("//td[@title='defenseValue']");
			var LDdefenseValue = calfSystem.findNode("//td[@title='LDdefenseValue']");
			defenseNumber=defenseValue.innerHTML.replace(/,/,"")*1;
			LDdefenseNumber=LDdefenseValue.innerHTML.replace(/,/,"")*1;
			defenseValue.innerHTML = Helper.addCommas(defenseNumber + Math.round(LDdefenseNumber*relicMultiplier));
			var armorValue = calfSystem.findNode("//td[@title='armorValue']");
			var LDarmorValue = calfSystem.findNode("//td[@title='LDarmorValue']");
			armorNumber=armorValue.innerHTML.replace(/,/,"")*1;
			LDarmorNumber=LDarmorValue.innerHTML.replace(/,/,"")*1;
			armorValue.innerHTML = Helper.addCommas(armorNumber + Math.round(LDarmorNumber*relicMultiplier));
			var damageValue = calfSystem.findNode("//td[@title='damageValue']");
			var LDdamageValue = calfSystem.findNode("//td[@title='LDdamageValue']");
			damageNumber=damageValue.innerHTML.replace(/,/,"")*1;
			LDdamageNumber=LDdamageValue.innerHTML.replace(/,/,"")*1;
			damageValue.innerHTML = Helper.addCommas(damageNumber + Math.round(LDdamageNumber*relicMultiplier));
			var hpValue = calfSystem.findNode("//td[@title='hpValue']");
			var LDhpValue = calfSystem.findNode("//td[@title='LDhpValue']");
			hpNumber=hpValue.innerHTML.replace(/,/,"")*1;
			LDhpNumber=LDhpValue.innerHTML.replace(/,/,"")*1;
			hpValue.innerHTML = Helper.addCommas(hpNumber + Math.round(LDhpNumber*relicMultiplier));
			var defendersProcessed = calfSystem.findNode("//td[@title='defendersProcessed']");
			defendersProcessedNumber=defendersProcessed.innerHTML.replace(/,/,"")*1;
			defendersProcessed.innerHTML = Helper.addCommas(defendersProcessedNumber + 1);
			var LDpercentageValue = calfSystem.findNode("//td[@title='LDPercentage']");
			LDpercentageValue.innerHTML = (relicMultiplier*100) + "%";
		}
	},

	position: function() {
		var result = new Object();
		var posit = calfSystem.findNode("//td[contains(@background, '/sigma2/coord_bg_0.gif')]/font/center");
		if (!posit) return;
		var thePosition=posit.textContent;
		var positionRE=/-\s*\((\d+),\s*(\d+)\)/
		var positionX = parseInt(thePosition.match(positionRE)[1]);
		var positionY = parseInt(thePosition.match(positionRE)[2]);
		result.X=positionX;
		result.Y=positionY;
		return result
	},

	mapThis: function() {
		return;
		var realm = calfSystem.findNode("//td[contains(@background,'/skin/realm_top_b2.jpg')]/center/nobr/b");
		// if ((realm) && (posit)>0) {
			var levelName=realm.innerHTML;
			var theMap = calfSystem.getValueJSON("map")
			// GM_log(GM_getValue("map"))
			// theMap = null;
			if (!theMap) {
				theMap = new Object;
				theMap["levels"] = {};
			}
			if (!theMap["levels"][levelName]) theMap["levels"][levelName] = {};
			if (!theMap["levels"][levelName][positionX]) theMap["levels"][levelName][positionX]={};
			theMap["levels"][levelName][positionX][positionY]="!";
			GM_setValue("map", JSON.stringify(theMap));
		// }
	},

	injectViewRecipe: function() {
		var components=calfSystem.findNodes("//b[.='Components Required']/../../following-sibling::tr[2]//img");
		for (var i=0; i<components.length; i++) {
			var mo=components[i].getAttribute("onmouseover");
			calfSystem.xmlhttp(Helper.linkFromMouseoverCustom(mo), function(responseDetails) {Helper.injectViewRecipeLinks(responseDetails.responseText, this.callback);}, components[i]);
		}
	},

	plantFromComponent: function(aComponent) {
		switch(aComponent) {
			case "Amber Essense": return "Amber Plant"; break;
			case "Blood Bloom Flower": return "Blood Bloom Plant"; break;
			case "Dark Shade ": return "Dark Shade Plant"; break;
			case "Snake Eye": return "Elya Snake Head"; break;
			case "Snake Venom Fang": return "Elya Snake Head"; break;
			case "Heffle Wart": return "Heffle Wart Plant"; break;
			case "Jademare Blossom": return "Jademare Plant"; break;
			case "Trinettle Leaf": return "Trinettle Plant"; break;
			default: return aComponent;
		}
	},

	injectViewRecipeLinks: function(responseText, callback) {
		var itemRE = /<b>([^<]+)<\/b>/i;
		var itemName = itemRE.exec(responseText);
		if (itemName) itemName=itemName[1];
		var itemLinks = document.createElement("td");
		itemLinks.innerHTML =
			'<a href="' + calfSystem.server + '?cmd=auctionhouse&type=-1&search_text='
			+ escape(Helper.plantFromComponent(itemName))
			+ '">AH</a>';
		var counter=calfSystem.findNode("../../../../tr[2]/td", callback);
		counter.setAttribute("colspan", "2");
		callback.parentNode.parentNode.parentNode.appendChild(itemLinks);
	},
/*
			linkFromMouseover: function(mouseOver) {
		var reParams=/(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/;
		var reResult=reParams.exec(mouseOver);
		var itemId=reResult[1];
		var invId=reResult[2];
		var type=reResult[3];
		var pid=reResult[4];
		var theUrl = "fetchitem.php?item_id=" + itemId + "&inv_id=" + invId + "&t="+type + "&p="+pid
		theUrl = calfSystem.server + theUrl;
		return theUrl
	},
*/

	injectAdvisor: function() {
		var titleCells=calfSystem.findNodes("//tr[td/b='Member']/td");
		for (var i=0; i<titleCells.length; i++) {
			var cell=titleCells[i];
			cell.style.textDecoration="underline";
			cell.style.cursor="pointer";
			cell.innerHTML=cell.innerHTML.replace(/^&nbsp;/,"");
			cell.addEventListener('click', Helper.sortAdvisor, true);
		}
	},

	sortAdvisor: function(evt) {
		var headerClicked=evt.target.textContent;
		var parentTables=calfSystem.findNodes("ancestor::table", evt.target)
		var list=parentTables[parentTables.length-1];

		Helper.advisorRows = new Array();
		for (var i=1; i<list.rows.length-1; i++){
			var theRow=list.rows[i];
			Helper.advisorRows[i-1] = {
				'Member': theRow.cells[0].textContent,
				'GoldFromDeposits': theRow.cells[1].textContent,
				'GoldFromTax': theRow.cells[2].textContent,
				'GoldTotal': theRow.cells[3].textContent,
				'FSPs': theRow.cells[4].textContent,
				'SkillsCast': theRow.cells[5].textContent,
				'GroupsCreated': theRow.cells[6].textContent,
				'GroupsJoined': theRow.cells[7].textContent,
				'RelicsCaptured': theRow.cells[8].textContent,
				'XPContrib': theRow.cells[9].textContent
			};
		}

		if (Helper.sortAsc==undefined) Helper.sortAsc=true;
		if (Helper.sortBy && Helper.sortBy==headerClicked) {
			Helper.sortAsc=!Helper.sortAsc;
		}
		Helper.sortBy=headerClicked;

		if (headerClicked=="Member") {
			Helper.advisorRows.sort(Helper.stringSort)
		}
		else {
			Helper.advisorRows.sort(Helper.numberSort)
		}

		var result='<tr>' + list.rows[0].innerHTML + '</tr>'


		for (var i=0; i<Helper.advisorRows.length; i++){
			var r = Helper.advisorRows[i];
			var bgColor=((i % 2)==0)?'bgcolor="#e7c473"':'bgcolor="#e2b960"'
			result += '<TR>'+
			'<TD '+bgColor+' ><FONT size="1"> '+r.Member+'</FONT></TD>'+
			'<TD '+bgColor+' align="center"><FONT size="1">'+r.GoldFromDeposits+'</FONT></TD>'+
			'<TD '+bgColor+' align="center"><FONT size="1">'+r.GoldFromTax+'</FONT></TD>'+
			'<TD '+bgColor+' align="center"><FONT size="1">'+r.GoldTotal+'</FONT></TD>'+
			'<TD '+bgColor+' align="center"><FONT size="1">'+r.FSPs+'</FONT></TD>'+
			'<TD '+bgColor+' align="center"><FONT size="1">'+r.SkillsCast+'</FONT></TD>'+
			'<TD '+bgColor+' align="center"><FONT size="1">'+r.GroupsCreated+'</FONT></TD>'+
			'<TD '+bgColor+' align="center"><FONT size="1">'+r.GroupsJoined+'</FONT></TD>'+
			'<TD '+bgColor+' align="center"><FONT size="1">'+r.RelicsCaptured+'</FONT></TD>'+
			'<TD '+bgColor+' align="center"><FONT size="1">'+r.XPContrib+'</FONT></TD></TR>';
		}
		result+='<tr>' + list.rows[list.rows.length-1].innerHTML + '</tr>'

		list.innerHTML=result;

		for (var i=0; i<list.rows[0].cells.length; i++) {
			var cell=list.rows[0].cells[i];
			// GM_log(cell);
			cell.style.textDecoration="underline";
			cell.style.cursor="pointer";
			cell.innerHTML=cell.innerHTML.replace(/^&nbsp;/,"");
			cell.addEventListener('click', Helper.sortAdvisor, true);
		}

	},

	stringSort: function(a,b) {
		var result=0;
		if (a[Helper.sortBy].toLowerCase()<b[Helper.sortBy].toLowerCase()) result=-1;
		if (a[Helper.sortBy].toLowerCase()>b[Helper.sortBy].toLowerCase()) result=+1;
		if (!Helper.sortAsc) result=-result;
		return result;
	},

	numberSort: function(a,b) {
		var result=0;
		var valueA=a[Helper.sortBy];
		var valueB=b[Helper.sortBy];
		if (typeof valueA=="string") valueA=parseInt(valueA.replace(/,/g,""));
		if (typeof valueB=="string") valueB=parseInt(valueB.replace(/,/g,""));
		result = valueA-valueB;
		if (!Helper.sortAsc) result=-result;
		return result;
	},

	questStatusSort: function(a,b) {
		var result=0;
		var valueA,valueB;
		var statuses = ["Incomplete", "Complete", ""];
		if (!a[Helper.sortBy]) {
			valueA=Helper.sortAsc?50:-50
		}
		else {
			valueA=statuses.indexOf(a[Helper.sortBy]);
		}
		if (!b[Helper.sortBy]) {
			valueB=Helper.sortAsc?50:-50
		}
		else {
			valueB=statuses.indexOf(b[Helper.sortBy]);
		}

		result = valueA-valueB;
		if (!Helper.sortAsc) result=-result;
		return result;
	},

	checkBuffs: function() {
		//

		var replacementText = "<td background='" + calfSystem.imageServer + "/skin/realm_right_bg.jpg'>"
		replacementText += "<table width='280' cellpadding='1' style='margin-left:28px; margin-right:28px; " +
			"font-size:medium; border-spacing: 1px; border-collapse: collapse;'>"
		replacementText += "<tr><td colspan='2' height='10'></td></tr><tr><tr><td height='1' bgcolor='#393527' " +
			"colspan='2'></td></tr><tr>";

		var hasShieldImp = calfSystem.findNode("//img[contains(@onmouseover,'Summon Shield Imp')]");
		var hasDeathDealer = calfSystem.findNode("//img[contains(@onmouseover,'Death Dealer')]");
		if (hasDeathDealer || hasShieldImp) {
			var re=/(\d) HP remaining/;
			var impsRemaining = 0;
			if (hasShieldImp) {
				//textToTest = "tt_setWidth(105); Tip('<center><b>Summon Shield Imp<br>2 HP remaining<br></b> (Level: 150)</b><br>[Click to De-Activate]</center>');";
				textToTest = hasShieldImp.getAttribute("onmouseover");
				impsRemainingRE = re.exec(textToTest);
				impsRemaining = impsRemainingRE[1];
			}
			var applyImpWarningColor = " style='color:green; font-size:medium;'";
			if (impsRemaining<2){
				applyImpWarningColor = " style='color:red; font-size:large; font-weight:bold'";
			}
			replacementText += "<tr><td" + applyImpWarningColor + ">Shield Imps Remaining: " +  impsRemaining + "</td></tr>"
			if (hasDeathDealer) {
				if (GM_getValue("lastDeathDealerPercentage")==undefined) GM_setValue("lastDeathDealerPercentage", 0);
				if (GM_getValue("lastKillStreak")==undefined) GM_setValue("lastKillStreak", 0);
				var lastDeathDealerPercentage = GM_getValue("lastDeathDealerPercentage");
				var lastKillStreak = GM_getValue("lastKillStreak");
				if (impsRemaining>0 && lastDeathDealerPercentage == 20) {
					replacementText += "<tr><td style='font-size:small; color:black'>Kill Streak: <span findme='killstreak'>&gt;" + Helper.addCommas(lastKillStreak) +
						"</span> Damage bonus: <span findme='damagebonus'>20</span>%</td></tr>"
				} else {
					replacementText += "<tr><td style='font-size:small; color:navy'>Kill Streak: <span findme='killstreak'>" + Helper.addCommas(lastKillStreak) +
						"</span> Damage bonus: <span findme='damagebonus'>" + lastDeathDealerPercentage + "</span>%</td></tr>";
					calfSystem.xmlhttp("index.php?cmd=profile", function(responseDetails) {Helper.getKillStreak(responseDetails.responseText);});
				}
			}
		}

		if (GM_getValue("showHuntingBuffs")) {
			var buffs=GM_getValue("huntingBuffs");
			var buffAry=buffs.split(",")
			var missingBuffs = new Array();
			for (var i=0;i<buffAry.length;i++) {
				if (!calfSystem.findNode("//img[contains(@onmouseover,'" + buffAry[i] + "')]")) {
					missingBuffs.push(buffAry[i]);
				}
			}
			if (missingBuffs.length>0) {
				replacementText += "<tr><td colspan='2' align='center'><span style='font-size:x-small; color:navy;'>" +
					"You are missing some hunting buffs<br/>("
				replacementText += missingBuffs.join(", ")
				replacementText += ")</span></td></tr>"
			}
			replacementText += "<tr><td colspan='2' height='10'></td></tr><tr><td height='1' bgcolor='#393527' colspan='2'></td></tr>";
			replacementText += "</table>";
		}
		replacementText += "</td>" ;

		var realmRightBottom = calfSystem.findNode("//tr[contains(td/img/@src, 'realm_right_bottom.jpg')]");
		if (!realmRightBottom) return;
		var injectHere = realmRightBottom.parentNode.parentNode
		//insert after kill all monsters image and text
		newRow=injectHere.insertRow(2);

		newRow.innerHTML=replacementText;
	},

	injectQuestBookFull: function() {
		if (!GM_getValue("showCompletedQuests")) return;
		var quests = Data.questMatrix();
		var questTable = calfSystem.findNode("//table[@width='100%' and @cellPadding='2']");
		questTable.setAttribute("findme","questTable");
		var questNamesOnPage = [];
		var hideQuests=[];
		if (GM_getValue("hideQuests")) hideQuests=GM_getValue("hideQuestNames").split(",");
		for (var i=0;i<questTable.rows.length;i++) {
			var aRow = questTable.rows[i];
			if (i!=0) {
				if (aRow.cells[0].innerHTML) {
					var questName = aRow.cells[0].firstChild.innerHTML.replace(/  /g," ");
					var insertHere = aRow.cells[0];
					questNamesOnPage.push(questName);
					for (var j=0;j<quests.length;j++) {
						var aCell = aRow.cells[0]
						var imgElement = aCell.nextSibling.firstChild;
						var matrixQuestName = quests[j].questName.replace(/  /g," ");

						// GM_log(questName + "\t" + hideQuests.indexOf(questName));

						if (questName == matrixQuestName && imgElement.getAttribute("title") != "Completed") {
							if (hideQuests.indexOf(matrixQuestName)>=0) {
								aRow.parentNode.removeChild(aRow.nextSibling);
								aRow.parentNode.removeChild(aRow.nextSibling);
								aRow.parentNode.removeChild(aRow.nextSibling);
								aRow.parentNode.removeChild(aRow);
							} else {
								insertHere.innerHTML += " <span style='color:gray;'>Quest level:</span> " +
									"<span style='color:blue;'>" + quests[j].level +
									"</span> <span style='color:gray;'>Quest location:</span> " +
									"<span style='color:blue;'>" + quests[j].location + "</span>";
							}
							break;
						} else if (j==quests.length-1 && imgElement.getAttribute("title") != "Completed") {
							insertHere.innerHTML += " <span style='color:red;'>Quest not in array sorry (or error in array).</span>";
						}
					}
				}
			}
		}
	},

	injectQuestBookLite: function() {
		if (GM_getValue("showCompletedQuests")) return;
		var quests = Data.questMatrix();
		var questTable = calfSystem.findNode("//table[@width='100%' and @cellPadding='2']");
		questTable.setAttribute("findme","questTable");
		var hideNextRows = 0;
		var playerQuestList = [];
		var hideQuests=[];
		if (GM_getValue("hideQuests")) hideQuests=GM_getValue("hideQuestNames").split(",");

		for (var i=0;i<questTable.rows.length;i++) {
			var aRow = questTable.rows[i];
			if (i!=0) {
				if (hideNextRows > 0) {
					aRow.style.display = "none";
					hideNextRows --;
				}
				if (aRow.cells[0].innerHTML) {
					var questName = aRow.cells[0].firstChild.innerHTML;
					var insertHere = aRow.cells[0];
					var killThis = false;
					for (var j=0;j<quests.length;j++) {
						var matrixQuestName = quests[j].questName;
						if (questName == matrixQuestName) {
							if (hideQuests.indexOf(matrixQuestName)>=0) {
								aRow.parentNode.removeChild(aRow.nextSibling);
								aRow.parentNode.removeChild(aRow.nextSibling);
								aRow.parentNode.removeChild(aRow.nextSibling);
								aRow.parentNode.removeChild(aRow);
							} else {
								insertHere.innerHTML += " <span style='color:gray;'>Quest level:</span> <span style='color:blue;'>" +
									quests[j].level + "</span> <span style='color:gray;'>Quest location:</span> <span style='color:blue;'>" +
									quests[j].location + "</span>";
							}
							break;
						} else if (j==quests.length) {
							insertHere.innerHTML += " <span style='color:gray;'>Quest not in array sorry.</span>";
						}
					}
					var aCell = aRow.cells[0]
					var imgElement = aCell.nextSibling.firstChild;
					if (imgElement.getAttribute("title") == "Completed") {
						aRow.style.display = "none";
						hideNextRows = 3;
					}
					playerQuestList.push(questName);
				}
			}
			else {
				var questNameCell = aRow.firstChild.nextSibling;
				questNameCell.innerHTML += "&nbsp;&nbsp;<font style='color:blue;'>(Completed quests hidden - " +
					"see preferences to unhide)</font>"
			}
		}

		var currentPageElement = calfSystem.findNode("//option[@selected]");
		var pageText = currentPageElement.parentNode.parentNode.innerHTML;
		var lastPageNumberRE = /\&nbsp;of\&nbsp;(\d+)\&nbsp;/
		var lastPageNumber = lastPageNumberRE.exec(pageText)[1]*1;
		newRow = questTable.insertRow(-1);
		newCell = newRow.insertCell(0);
		newCell.colSpan = '2';
		newCell.style.display = 'none';
		newCell.innerHTML = "<span style='color:red;' findme='pagesProcessed'>1</span><span style='color:red;' findme='totalPages'>" + lastPageNumber + "</span>";

		newRow = questTable.insertRow(-1);
		newCell = newRow.insertCell(0);
		newCell.colSpan = '2';
		newCell.style.display = 'none';
		newCell.innerHTML = "<span style='color:red;' findme='playerQuestList'>" + playerQuestList.join() + "</span>";

		var pageCountElement = calfSystem.findNode("//select[@class='customselect']");
		//&nbsp;of&nbsp;5&nbsp;
		var pageRE = /\&nbsp;of\&nbsp;(\d+)\&nbsp;/
		var pageCount=parseInt(pageCountElement.parentNode.innerHTML.match(pageRE)[1]);
		for (var i=1;i<pageCount;i++) {
			calfSystem.xmlhttp("index.php?cmd=questbook&page=" + i, function(responseDetails) {Helper.injectQuestData(responseDetails.responseText);});
		}
	},

	injectQuestData: function(responseText) {
		var playerQuestListElement = calfSystem.findNode("//span[@findme='playerQuestList']");
		var playerQuestList = playerQuestListElement.innerHTML.split();

		var quests = Data.questMatrix();
		var doc=calfSystem.createDocument(responseText)
		var allItems = doc.getElementsByTagName("TD");
		for (var i=0;i<allItems.length;i++) {
			var anItem=allItems[i];
			if (anItem.innerHTML=="Quest Name") {
				var questTable = anItem.parentNode.parentNode;
			}
		}
		var OriginalQuestTable = calfSystem.findNode("//table[@findme='questTable']");
		var newRow, newCell;
		var insertNextRows = 0;
		for (var i=1;i<questTable.rows.length;i++) {
			var aRow = questTable.rows[i];
			if (insertNextRows > 0) {
				newRow = OriginalQuestTable.insertRow(OriginalQuestTable.rows.length);
				//newCell=newRow.insertCell(0);
				newRow.innerHTML = aRow.innerHTML;
				insertNextRows --;
			}
			if (aRow.cells[0].innerHTML) {
				var questName = aRow.cells[0].firstChild.textContent.replace(/  /g," ");
				var insertHere = aRow.cells[0];
				for (var j=0;j<quests.length;j++) {
					if (questName == quests[j].questName) {
						insertHere.innerHTML += " <span style='color:gray;'>Quest level:</span> <span style='color:blue;'>" +
							quests[j].level + "</span> <span style='color:gray;'>Quest location:</span> <span style='color:blue;'>" +
							quests[j].location + "</span>";
					} else if (j==quests.length) {
						insertHere.innerHTML += " <span style='color:gray;'>Quest not in array sorry.</span>";
					}
				}
				var aCell = aRow.cells[0]
				var imgElement = aCell.nextSibling.firstChild;
				if (imgElement.getAttribute("title") != "Completed") {
					newRow = OriginalQuestTable.insertRow(OriginalQuestTable.rows.length);
					newRow.innerHTML = aRow.innerHTML;
					insertNextRows = 3;
				}
				playerQuestList.push(questName);
			}
		}
		var pagesProcessedElement = calfSystem.findNode("//span[@findme='pagesProcessed']");
		var pagesProcessed = pagesProcessedElement.textContent*1;
		pagesProcessedElement.innerHTML = pagesProcessed + 1;
		playerQuestListElement.innerHTML = playerQuestList.join();
		var totalPagesElement = calfSystem.findNode("//span[@findme='totalPages']");
		var totalPages = totalPagesElement.textContent*1;
		var characterLevel = Helper.characterLevel;
		var pageOneQuestTable = calfSystem.findNode("//table[@findme='questTable']");

		if ((pagesProcessed+1) == totalPages) { //all pages processed so now we can find missing quests
			newRow = pageOneQuestTable.insertRow(-1);
			newCell = newRow.insertCell(0);
			newCell.colSpan = '2';
			newCell.innerHTML = "<span style='color:blue;'>List of <u>known</u> missing quests for your level. " +
				"If you find an error with this list, or a missing quest, please report it on the google code page related to this script.</span> ";
			for (var j=0;j<quests.length;j++) {
				var questName = quests[j].questName;
				var questLevel = quests[j].level;
				var questLocation = quests[j].location;
				if (playerQuestList.join().search(questName) == -1 && questLevel <= characterLevel) {
					newRow = pageOneQuestTable.insertRow(-1);
					newCell = newRow.insertCell(0);
					newCell.colSpan = '2';
					newCell.innerHTML = "<span style='color:gray;'>Known missing quest: " +
					"</span><span style='color:blue;'>" + questName +
					"</span> <span style='color:gray;'>level:</span> <span style='color:blue;'>" + questLevel +
					"</span> <span style='color:gray;'>location:</span> <span style='color:blue;'>" + questLocation + "</span>";
				}
			}
		}
	},

	injectWorld: function() {
		// Helper.mapThis();
		var realmRightBottom = calfSystem.findNode("//tr[contains(td/@background, 'location_header.gif')]");
		if (!realmRightBottom) return;
		var injectHere = realmRightBottom.parentNode.parentNode
		var newRow=injectHere.insertRow(2);
		var newCell=newRow.insertCell(0);
		// newCell.setAttribute("background", calfSystem.imageServer + "/skin/realm_right_bg.jpg");
		if (!GM_getValue("killAllAdvanced")) {GM_setValue("killAllAdvanced", "off")};
		var killStyle = GM_getValue("killAllAdvanced");
		if (GM_getValue("showQuickKillOnWorld")) {
			newCell.innerHTML='<div style="font-size:xx-small;">' +
				'Quick Kill' + Helper.helpLink('Quick Kill Style',
					'<b><u>single</u></b> will quick kill a single monster<br/> ' +
					'<b><u>type</u></b> will quick kill a type of monster<br/>' +
					'<b><u>off</u></b> returns control to game normal.') +
				':' +
				'<input type="radio" id="killAllAdvancedWorldOff" name="killAllAdvancedWorld" value="off"' +
					((killStyle == "off")?" checked":"") + '>' + ((killStyle == "off")?" <b>off</b>":"off") +
				'<input type="radio" id="killAllAdvancedWorldSingle" name="killAllAdvancedWorld" value="single"' +
					((killStyle == "single")?" checked":"") + '>' + ((killStyle == "single")?" <b>single</b>":"single") +
				'<input type="radio" id="killAllAdvancedWorldType" name="killAllAdvancedWorld"  value="type"' +
					((killStyle == "type")?" checked":"") + '>' + ((killStyle == "type")?" <b>type</b>":"type") +
				'</div>';
			document.getElementById('killAllAdvancedWorldOff').addEventListener('click', Helper.killAllAdvancedChangeFromWorld, true);
			document.getElementById('killAllAdvancedWorldSingle').addEventListener('click', Helper.killAllAdvancedChangeFromWorld, true);
			document.getElementById('killAllAdvancedWorldType').addEventListener('click', Helper.killAllAdvancedChangeFromWorld, true);
		}

		if (!GM_getValue("hideKrulPortal")) {
			var buttonRow = calfSystem.findNode("//tr[td/a/img[@title='Open Area Map']]");
			buttonRow.innerHTML += '<td valign="top" width="5"></td>' +
				'<td valign="top"><span style="cursor:pointer;" id="portaltokrul"><img src="' + calfSystem.imageServer +
				'/temple/3.gif" title="Instant Teleport to Taulin Rad Lands" border="1"></span></td>';
			document.getElementById('portaltokrul').addEventListener('click', Helper.portalToKrul, true);
		}

		// injectHere.style.display='none';
		Helper.checkBuffs();
		Helper.prepareCheckMonster();
		Helper.prepareCombatLog();
	},

	prepareCombatLog: function() {
		if (!GM_getValue("showCombatLog")) return;
		var reportsTable=calfSystem.findNode("//table[@width='320']/parent::*");
		if (!reportsTable) return;
		var tempLog=document.createElement("div");
		tempLog.id="reportsLog";
		var injLog=reportsTable.appendChild(tempLog);
		var is=injLog.style;
		is.color = 'black';
		is.backgroundImage='url(' + calfSystem.imageServer + '/skin/realm_right_bg.jpg)';
		is.maxHeight = '240px';
		is.width = '277px';
		is.maxWidth = is.width;
		is.marginLeft = '0px';
		is.marginRight = '0px';
		is.paddingLeft = '26px';
		is.paddingRight = '24px';
		is.overflow = 'hidden';
		is.fontSize = 'xx-small';
		is.textAlign = 'justify';
	},

	killAllAdvancedChangeFromWorld: function(evt) {
		var killAllAdvanced = GM_getValue("killAllAdvanced");
		if (!GM_getValue("killAllAdvanced")) {GM_setValue("killAllAdvanced", "off")};
		GM_setValue("killAllAdvanced", evt.target.value);
		window.location = 'index.php?cmd=world';
	},

	getMonster: function(index) {
		return calfSystem.findNodes("//a[contains(@href,'cmd=combat') and contains(@href,'max_turns=2')]")[index-1];
	},

	killSingleMonster: function(monsterNumber) {
		if (GM_getValue("killAllAdvanced") != "single") return;
		var kills=0;
		var monster = Helper.getMonster(monsterNumber);
		if (monster) {
			kills+=1;
			calfSystem.xmlhttp(monster.href, function(responseDetails, callback) {Helper.killedMonster(responseDetails, this.callback);}, {"node": monster, "index": monsterNumber});
		}
		if (kills>0) {
			calfSystem.xmlhttp("index.php?cmd=blacksmith&subcmd=repairall&fromworld=1");
		}
	},

	killSingleMonsterType: function(monsterType) {
		if (GM_getValue("killAllAdvanced") != "type") return;
		var kills=0;
		for (var i=1; i<=8; i++) {
			var monster = Helper.getMonster(i);
			if (monster) {
				thisMonsterType = monster.parentNode.parentNode.parentNode.firstChild.nextSibling.nextSibling.innerHTML;
				if (thisMonsterType == monsterType) {
					kills+=1;
					calfSystem.xmlhttp(monster.href, function(responseDetails, callback) {Helper.killedMonster(responseDetails, this.callback);}, {"node": monster, "index": i});
				}
			}
		}
		if (kills>0) {
			calfSystem.xmlhttp("index.php?cmd=blacksmith&subcmd=repairall&fromworld=1");
		}
	},

	prepareCheckMonster: function() {
		if (!GM_getValue("showCreatureInfo")) return;
		var monsters = calfSystem.findNodes("//a[contains(@href,'cmd=world&subcmd=viewcreature&creature_id=')]");
		if (!monsters) return;
		for (var i=0; i<monsters.length; i++) {
			var monster = monsters[i];
			if (monster) {
				var href=monster.href;
				calfSystem.xmlhttp(monster.href, function(responseDetails, callback) {Helper.checkedMonster(responseDetails, this.callback);}, monster);
			}
		}
	},

	checkedMonster: function(responseDetails, callback) {
		var creatureInfo=calfSystem.createDocument(responseDetails.responseText);
		var statsNode = calfSystem.findNode("//table[@width='400']", creatureInfo);
		if (!statsNode) {return;} // FF2 error fix
		var classNode = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Class:')]/following-sibling::td", creatureInfo);
		var levelNode = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Level:')]/following-sibling::td", creatureInfo);
		var attackNode = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Attack:')]/following-sibling::td", creatureInfo);
		var defenseNode = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Defense:')]/following-sibling::td", creatureInfo);
		var armorNode = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Armor:')]/following-sibling::td", creatureInfo);
		var damageNode = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Damage:')]/following-sibling::td", creatureInfo);
		var hitpointsNode = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'HP:')]/following-sibling::td", creatureInfo);
		var goldNode = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Gold:')]/following-sibling::td", creatureInfo);
		var enhanceNodesXpath = "//table[@width='400']/tbody/tr[contains(td,'Enhancements')]/following-sibling::*[td/font[@color='#333333']]"
		var enhanceNodes = calfSystem.findNodes(enhanceNodesXpath, creatureInfo);

		var hitpoints = parseInt(hitpointsNode.textContent.replace(/,/,""));
		var armorNumber = parseInt(armorNode.textContent.replace(/,/,""));
		var oneHitNumber = Math.ceil((hitpoints*1.053)+(armorNumber*1.053));
		/*
		if (statsNode) reportText += "<div style='color:#FFF380;'>Statistics</div>"
		if (classNode) reportText += "Class: " + classNode.textContent + "<br/>";
		if (levelNode) reportText += "Level: " + levelNode.textContent + "<br/>";
		if (attackNode) reportText += "Attack: " + attackNode.textContent + "<br/>";
		if (defenseNode) reportText += "Defense: " + defenseNode.textContent + "<br/>";
		if (armorNode) reportText += "Armor: " + armorNode.textContent + "<br/>";
		if (damageNode) reportText += "Damage: " + damageNode.textContent + "<br/>";
		if (goldNode) reportText += "Gold: " + goldNode.textContent + "<br/>";
		if (enhanceNodes) {
			if (enhanceNodes) reportText += "<div style='color:#FFF380;'>Enhancements</div>"
			for (i=0; i<enhanceNodes.length; i++) {
				reportText += enhanceNodes[i].textContent + "<br/>";
			}
		}
		*/
		var recolor=calfSystem.findNodes("//td[@bgcolor='#cd9e4b']", statsNode);
		for (var i=0; i<recolor.length; i++) {
			recolor[i].style.color="black";
		}
		recolor=calfSystem.findNodes("//font[@color='#333333']", statsNode);
		for (var i=0; i<recolor.length; i++) {
			recolor[i].style.color="#cccccc";
		}
		var killButtons=calfSystem.findNode("tbody/tr[td/input]", statsNode);
		var killButtonHeader=calfSystem.findNode("tbody/tr[contains(td,'Actions')]", statsNode);
		var killButtonParent=killButtonHeader.parentNode;

		levelNode.innerHTML += " (your level:<span style='color:yellow'>" + Helper.characterLevel + "</span>)"
		attackNode.innerHTML += " (your defense:<span style='color:yellow'>" + Helper.characterDefense + "</span>) "
		defenseNode.innerHTML += " (your attack:<span style='color:yellow'>" + Helper.characterAttack + "</span>)"
		armorNode.innerHTML += " (your damage:<span style='color:yellow'>" + Helper.characterDamage + "</span>)"
		damageNode.innerHTML += " (your armor:<span style='color:yellow'>" + Helper.characterArmor + "</span>)"
		hitpointsNode.innerHTML += " (your HP:<span style='color:yellow'>" + Helper.characterHP + "</span>)" +
			"(1H: <span style='color:red'>" + oneHitNumber + "</span>)"

		killButtonParent.removeChild(killButtons);
		killButtonParent.removeChild(killButtonHeader);
		callback.setAttribute("mouseOverText", statsNode.parentNode.innerHTML);
		callback.setAttribute("mouseOverWidth", "400");
		callback.addEventListener("mouseover", Helper.clientTip, true);
	},

	killedMonster: function(responseDetails, callback) {
		var doc=calfSystem.createDocument(responseDetails.responseText);

		var reportRE=/var\s+report=new\s+Array;\n(report\[[0-9]+\]="[^"]+";\n)*/;
		var report=responseDetails.responseText.match(reportRE);
		if (report) report=report[0]

		// var specialsRE=/<div id="specialsDiv" style="position:relative; display:block;"><font color='#FF0000'><b>Azlorie Witch Doctor was withered.</b></font>/
		var specials=calfSystem.findNodes("//div[@id='specialsDiv']", doc);

		var playerIdRE = /sigmastorm2.com\/\?ref=(\d+)/
		var playerId=document.body.innerHTML.match(playerIdRE)[1];
		GM_setValue("playerID",playerId);

		var xpGain=responseDetails.responseText.match(/var\s+xpGain=(-?[0-9]+);/)
		if (xpGain) {xpGain=xpGain[1]} else {xpGain=0};
		var goldGain=responseDetails.responseText.match(/var\s+goldGain=(-?[0-9]+);/)
		if (goldGain) {goldGain=goldGain[1]} else {goldGain=0};
		var guildTaxGain=responseDetails.responseText.match(/var\s+guildTaxGain=(-?[0-9]+);/)
		if (guildTaxGain) {guildTaxGain=guildTaxGain[1]} else {guildTaxGain=0};
		var levelUp=responseDetails.responseText.match(/var\s+levelUp=(-?[0-9]+);/)
		if (levelUp) {levelUp=levelUp[1]} else {levelUp=0};
		var lootRE=/You looted the item '<font color='(\#[0-9A-F]+)'>([^<]+)<\/font>'<\/b><br><br><img src=\"http:\/\/[0-9.]+\/items\/(\d+).gif\"\s+onmouseover="ajaxLoadCustom\([0-9]+,\s-1,\s+([0-9a-f]+),\s+[0-9]+,\s+''\);\">/
		var infoRE=/<center>INFORMATION<\/center><\/font><\/td><\/tr>\t+<tr><td><font size=2 color=\"\#000000\"><center>([^<]+)<\/center>/i;
		var info=responseDetails.responseText.match(infoRE)
		if (info) {info=info[1]} else {info=""};
		var lootMatch=responseDetails.responseText.match(lootRE)
		var lootedItem = "";
		var lootedItemId = "";
		var lootedItemVerify="";
		if (lootMatch && lootMatch.length>0) {
			lootedItem=lootMatch[2];
			lootedItemId=lootMatch[3];
			lootedItemVerify=lootMatch[4];
		}
		var shieldImpDeathRE = /Shield Imp absorbed all damage/;
		var shieldImpDeath = responseDetails.responseText.match(shieldImpDeathRE);

		var monster = callback.node;
		if (monster) {
			var result=document.createElement("div");
			var resultHtml = "<small><small>"+callback.index+". XP:" + xpGain + " Gold:" + goldGain + " (" + guildTaxGain + ")</small></small>";
			var resultText = "XP:" + xpGain + " Gold:" + goldGain + " (" + guildTaxGain + ")\n"
			if (info!="") {
				resultHtml += "<br/><div style='font-size:x-small;width:120px;overflow:hidden;' title='" + info + "'>" + info + "</div>";
				resultText += info + "\n";
			}
			if (lootedItem!="") {
				// I've temporarily disabled the ajax thingie, as it doesn't seem to work anyway.
				resultHtml += "<br/><small><small>Looted item:<span onmouseoverDISABLED=\"ajaxLoadCustom(" +
					lootedItemId + ", -1, '" + lootedItemVerify + "', " + playerId + ", '');\" >" +
					lootedItem + "</span></small></small>";
				resultText += "Looted item:" + lootedItem + "\n";
			}
			if (shieldImpDeath) {
				resultHtml += "<br/><small><small><span style='color:red;'>Shield Imp Death</span></small></small>";
				resultText += "Shield Imp Death\n"
			}
			if (xpGain<0) result.style.color='red';
			result.innerHTML=resultHtml
			var monsterParent = monster.parentNode;
			result.id = "result" + callback.index;
			if (report) {
				var reportLines=report.split("\n");
				var reportHtml="";
				var reportText="";
				if (specials) {
					reportHtml += "<div style='color:red'>"
					for (var i=0; i<specials.length; i++) {
						reportHtml += specials[i].textContent + "<br/>";
						reportText += specials[i].textContent + "\n";
					}
					reportHtml += "</div>";
				}
				for (var i=0; i<reportLines.length; i++) {
					var reportMatch = reportLines[i].match(/\"(.*)\"/);
					if (reportMatch) {
						reportHtml += "<br/>" + reportMatch[1];
						reportText += reportMatch[1].replace(/<br>/g, "\n") + "\n";
					}
				}
				if (levelUp=="1") {
					reportHtml += '<br/><br/><div style="color:#999900;font-weight:bold;>Your level has increased!</div>';
					reportText += "Your level has increased!\n";
				}
				if (levelUp=="-1") {
					reportHtml += '<br/><br/><div style="color:#991100;font-weight:bold;">Your level has decreased!</div>';
					reportText += "Your level has decreased!\n";
				}
				mouseOverText = "<div><div style='color:#FFF380;text-align:center;'>Combat Results</div>" + reportHtml + "</div>";
				Helper.appendCombatLog(reportHtml);
				result.setAttribute("mouseOverText", mouseOverText);
				if (GM_getValue("keepLogs")) {
					var now=new Date();
					Helper.appendSavedLog("\n================================\n" + now.toLocaleFormat("%Y-%m-%d %H:%m:%S") + "\n" + resultText + "\n" + reportText);
				}
			}
			monsterParent.innerHTML = "";
			monsterParent.insertBefore(result, monsterParent.nextSibling);
			if (report) {
				document.getElementById("result" + callback.index).addEventListener("mouseover", Helper.clientTip, true);
			}
		}
	},

	appendSavedLog: function(text) {
		var theLog=GM_getValue("CombatLog");
		if (!theLog) theLog="";
		theLog+=text;
		GM_setValue("CombatLog", theLog);
	},

	appendCombatLog: function(text) {
		var reportLog = calfSystem.findNode("//div[@id='reportsLog']");
		if (!reportLog) return;
		reportLog.innerHTML += text + "<br/>";
	},

	scrollUpCombatLog: function() {
		var reportLog = calfSystem.findNode("//div[@id='reportsLog']");
		reportLog.scrollTop-=10;
	},

	scrollDownCombatLog: function() {
		var reportLog = calfSystem.findNode("//div[@id='reportsLog']");
		reportLog.scrollTop+=10;
	},

	clientTip: function(evt) {
		var target=evt.target;
		var value, width;
		do {
			if (target.getAttribute) {
				value=target.getAttribute("mouseovertext");
				width=target.getAttribute("mouseoverwidth");
			}
			target=target.parentNode;
		} while (!value && target);
		if (value) {
			if (!width) width="250";
			unsafeWindow.tt_setWidth(parseInt(width));
			unsafeWindow.Tip(value);
		}
	},

	prepareGuildList: function() {
		if (GM_getValue("disableGuildOnlineList")) return;
		var injectHere = calfSystem.findNode("//table[@width='120' and contains(.,'New?')]")
		if (!injectHere) return;
		var info = injectHere.insertRow(0);
		var cell = info.insertCell(0);
		cell.innerHTML="<span id='Helper:GuildListPlaceholder'></span>";
		Helper.retrieveGuildData();
	},

	retrieveGuildData: function() {
		var memberList = calfSystem.getValueJSON("memberlist");
		if (memberList) {
			if ((new Date()).getTime() - memberList.changedOn > 15000) memberList = null; // invalidate cache
		}

		if (!memberList) {
			calfSystem.xmlhttp("index.php?cmd=guild&subcmd=manage", function(responseDetails) {Helper.parseGuildForWorld(responseDetails.responseText);});
		} else {
			var memberList = calfSystem.getValueJSON("memberlist");
			memberList.isRefreshed = false;
			Helper.injectGuildList(memberList);
		}
	},

	parseGuildForWorld: function(details) {
		var doc=calfSystem.createDocument(details);
		var allTables = doc.getElementsByTagName("TABLE")
		var membersTable;
		for (var i=0;i<allTables.length;i++) {
			var oneTable=allTables[i];
			if (oneTable.rows.length>=1 && oneTable.rows[0].cells.length>=1 && (/<b>Members<\/b>/i).test(oneTable.rows[0].cells[0].innerHTML)) {
				membersTable=oneTable;
			}
		}
		if (membersTable) {
			var membersDetails=membersTable.getElementsByTagName("TABLE")[0];
			var memberList = new Object();
			memberList.members = new Array();
			memberList.lookupByName = new Array();
			memberList.lookupById = new Array();
			for (var i=0;i<membersDetails.rows.length;i++) {
				var aRow = membersDetails.rows[i];
				if (aRow.cells.length==5 && aRow.cells[0].firstChild.title) {
					var aMember = new Object;
					aMember.status = aRow.cells[0].firstChild.title;
					aMember.id = (/[0-9]+$/).exec(aRow.cells[1].firstChild.nextSibling.href)[0]
					aMember.name=aRow.cells[1].firstChild.nextSibling.textContent;
					aMember.level=aRow.cells[2].textContent;
					aMember.rank=aRow.cells[3].textContent;
					aMember.xp=aRow.cells[4].textContent;
					memberList.members.push(aMember);
					memberList.lookupByName.push(aMember.name)
					memberList.lookupById.push(aMember.id)
				}
			}
			memberList.changedOn = new Date().getTime();
			memberList.isRefreshed = true;
			Helper.injectGuildList(memberList);
		}
	},

	prepareChat: function() {
		var showLines = parseInt(GM_getValue("chatLines"))
		if (showLines==0) return;
		var injectHere = calfSystem.findNode("//table[@width='120' and contains(.,'New?')]")
		if (!injectHere) return;
		var info = injectHere.insertRow(GM_getValue("disableGuildOnlineList")?0:1)
		var cell = info.insertCell(0);
		cell.innerHTML="<span id='Helper:ChatPlaceholder'></span>";
		var chat = calfSystem.getValueJSON("chat");
		var newChat = calfSystem.findNode("//table[contains(.,'chat messages')]")
		if (!chat || newChat || ((new Date()).getTime() - chat.lastUpdate > 15000)) {
			Helper.retrieveChat();
		} else {
			chat.isRefreshed=false;
			Helper.injectChat(chat);
		}
	},

	retrieveChat: function() {
		calfSystem.xmlhttp("index.php?cmd=guild&subcmd=chat", function(responseDetails) {Helper.parseChatForWorld(responseDetails.responseText);});
	},

	parseChatForWorld: function(chatText) {
		var doc=calfSystem.createDocument(chatText);
		var chatTable = calfSystem.findNode("//table[@border='0' and @cellpadding='2' and @width='100%']", doc);
		if (!chatTable) return;
		// GM_log(chatTable.innerHTML);
		var chat = new Object();
		var chatConfirm=calfSystem.findNode("//input[@name='xc']", doc);
		chat.isRefreshed=true;
		chat.lastUpdate = (new Date()).getTime();
		chat.messages = new Array();
		for (var i=chatTable.rows.length-1; i>0; i--) {
			var aRow = chatTable.rows[i];
			if (aRow.cells.length==3) {
				var aMessage=new Object();
				aMessage.time=aRow.cells[0].textContent;
				aMessage.from=aRow.cells[1].textContent;
				aMessage.text=aRow.cells[2].textContent;
				chat.messages.push(aMessage);
			}
		}
		chat.confirm=chatConfirm.value;
		Helper.injectChat(chat);
	},

	injectChat: function(chat){
		var injectHere = document.getElementById("Helper:ChatPlaceholder");
		var newTable=false;

		var displayList = document.getElementById("Helper:ChatWindow");
		if (!displayList) {
			displayList=document.createElement("TABLE");
			displayList.id="Helper:ChatWindow";
			displayList.style.border = "1px solid #c5ad73";
			displayList.style.backgroundColor = (chat.isRefreshed)?"#6a5938":"#4a3918";
			displayList.cellPadding = 1;
			displayList.width = 125;
			newTable=true;
		}
		else {
			while (displayList.rows.length>0) {
				displayList.deleteRow(0);
			}
			displayList.style.backgroundColor = (chat.isRefreshed)?"#6a5938":"#4a3918";
		}

		var aRow=displayList.insertRow(displayList.rows.length);
		var aCell=aRow.insertCell(0);

		var result="<div style='font-size:xx-small' id='chatFrame'>";

		var showLines = parseInt(GM_getValue("chatLines"));
		if (isNaN(showLines)) {
			showLines=10
			GM_setValue("chatLines", showLines)
		}
		var startFrom = (chat.messages.length>showLines)?chat.messages.length-showLines:0;
		for (var i=startFrom; i<chat.messages.length; i++) {
			result += "<span style='color:#F5F298' title='"+chat.messages[i].time+"'>"
			result += chat.messages[i].from
			result += ":</span><span style='color:white'>"
			result += chat.messages[i].text.replace(/</g,"&lt;").replace(/>/g,"&gt;");
			result += "</span><br/>";
		}
		result += '<form action="index.php" method="post" id="Helper:ChatBox" onsubmit="return false;">'
		result += '<input type="hidden" value="' + chat.confirm + '" name="xc"/>'
		result += '<input type="text" class="custominput" size="14" name="msg"/>'
		result += '<input type="submit" class="custominput" value="Send" name="submit"/>'
		result += '</form>'
		result += '</div>'

		aCell.innerHTML = result;


		if (newTable) {
			var breaker=document.createElement("BR");
			injectHere.parentNode.insertBefore(breaker, injectHere.nextSibling);
			injectHere.parentNode.insertBefore(displayList, injectHere.nextSibling);
		}

		document.getElementById('Helper:ChatBox').addEventListener('submit', Helper.sendChat, true);

		//document.removeEventListener("keypress", unsafeWindow.document.onkeypress, true);

		GM_setValue("chat", JSON.stringify(chat));
	},

	sendChat: function(evt) {
		var oForm=evt.target;

		var confirm=calfSystem.findNode("//input[@name='xc']", evt.target.form).value;
		var msg=calfSystem.findNode("//input[@name='msg']", evt.target.form).value;
		calfSystem.findNode("//input[@name='msg']", evt.target.form).value="";
		if (msg=="") {
			Helper.retrieveChat();
			return false;
		}

		GM_xmlhttpRequest({
			method: 'POST',
			url: calfSystem.server + "index.php",
			headers: {
				"User-Agent" : navigator.userAgent,
				"Content-Type": "application/x-www-form-urlencoded",
				"Referer": document.location,
				"Cookie" : document.cookie
			},
			data: "cmd=guild&subcmd=dochat&xc="+confirm+"&msg="+encodeURIComponent(msg)+"&submit=Send",
			onload: function(responseDetails) {
				Helper.retrieveChat();
			},
		})

		return false;
	},

	replaceKeyHandler: function() {
		unsafeWindow.document.onkeypress = null;
		unsafeWindow.document.onkeypress = Helper.keyPress;
	},

	moveMe: function(dx, dy) {
		var pos=Helper.position();
		if (pos) {
			window.location = 'index.php?cmd=world&subcmd=move&x=' + (pos.X+dx) + '&y=' + (pos.Y+dy);
		}
		if (Helper.page=="world/map/-(-)") {
			var playerTile=calfSystem.findNode("//img[contains(@src,'player_tile.gif')]/..");
			var pos = {};
			pos.X=playerTile.cellIndex;
			pos.Y=playerTile.parentNode.rowIndex;
			calfSystem.xmlhttp('index.php?cmd=world&subcmd=move&x=' + (pos.X+dx) + '&y=' + (pos.Y+dy), function(responseDetails) {window.location= calfSystem.server + "index.php?cmd=world&subcmd=map";});
		}
	},

	keyPress: function (evt) {
		var r, s;
		if (evt.target.tagName!="HTML") return;

		// ignore control, alt and meta keys (I think meta is the command key in Macintoshes)
		if (evt.ctrlKey) return;
		if (evt.metaKey) return;
		if (evt.altKey) return;

		r = evt.charCode;
		s = evt.keyCode;

		switch (r) {
		case 113: // nw
			Helper.moveMe(-1,-1)
			break;
		case 119: // n
			Helper.moveMe(0,-1);
			break;
		case 101: // ne
			Helper.moveMe(1,-1);
			break;
		case 97: // w
			Helper.moveMe(-1,0);
			break;
		case 100: // e
			Helper.moveMe(1,0);
			break;
		case 122: // sw
			Helper.moveMe(-1,1);
			break;
		case 120: // s
			Helper.moveMe(0,1);
			break;
		case 99: // se
			Helper.moveMe(1,1);
			break;
		case 114: // repair
			window.location = 'index.php?cmd=blacksmith&subcmd=repairall&fromworld=1';
			break;
		case 103: // create group
			window.location = 'index.php?cmd=guild&subcmd=groups&subcmd2=create&fromworld=1';
			break;
		case 49:
		case 50:
		case 51:
		case 52:
		case 53:
		case 54:
		case 55:
		case 56: // keyed combat
			var index	= r-48;
			var linkObj	= Helper.getMonster(index);
			if (linkObj!=null) {
				var killStyle = GM_getValue("killAllAdvanced");
				//kill style off
				if (killStyle == "off") {
					window.location = linkObj.href
				}
				//kill style single
				if (killStyle == "single") {
					Helper.killSingleMonster(index);
				}1
				//kill style type
				if (killStyle == "type") {
					var monsterType = linkObj.parentNode.parentNode.parentNode.firstChild.nextSibling.nextSibling.innerHTML
					Helper.killSingleMonsterType(monsterType);
				}
			}
			break;
		case 57: // debug
			Helper.appendCombatLog('test<br/>')
			break;
		case 98: // backpack [b]
			window.location = 'index.php?cmd=profile&subcmd=dropitems&fromworld=1';
			break;
		case 19: // quick buffs
			openWindow("index.php?cmd=quickbuff", "fsQuickBuff", 618, 800, ",scrollbars");
			break;
		case 48: // return to world
			window.location = 'index.php?cmd=world';
			break;
		case 109: // map
			// window.open('index.php?cmd=world&subcmd=map', 'fsMap');
			openWindow('index.php?cmd=world&subcmd=map', 'fsMap', 650, 650, ',scrollbars,resizable');
			break;
		case 0: // special key
			switch (s) {
			case 37: // w
				Helper.moveMe(-1,0);
				evt.preventDefault();
				evt.stopPropagation();
				break;
			case 38: // n
				Helper.moveMe(0,-1);
				evt.preventDefault();
				evt.stopPropagation();
				break;
			case 39: // e
				Helper.moveMe(1,0);
				evt.preventDefault();
				evt.stopPropagation();
				break;
			case 40: // s
				Helper.moveMe(0,1);
				evt.preventDefault();
				evt.stopPropagation();
				break;
			case 33:
				if (calfSystem.findNode("//div[@id='reportsLog']")) {
					Helper.scrollUpCombatLog();
					evt.preventDefault();
					evt.stopPropagation();
				}
				break;
			case 34:
				if (calfSystem.findNode("//div[@id='reportsLog']")) {
					Helper.scrollDownCombatLog();
					evt.preventDefault();
					evt.stopPropagation();
				}
				break;
			default:
				if (calfSystem.debug) GM_log('special key: ' +s);
			}
			break;
		default:
			if (calfSystem.debug) GM_log('standard key: ' +r);
		}
		return true;
	},

	addLogColoring: function(logScreen, dateColumn) {
		if (!GM_getValue("enableLogColoring")) return;
		var lastCheckScreen = "last" + logScreen + "Check";
		var localLastCheckMilli=GM_getValue(lastCheckScreen);
		if (!localLastCheckMilli) localLastCheckMilli=(new Date()).getTime();

		var chatTable = calfSystem.findNode("//table[@border='0' and @cellpadding='2' and @width='100%']");

		var localDateMilli = (new Date()).getTime();
		var gmtOffsetMinutes = (new Date()).getTimezoneOffset();
		var gmtOffsetMilli = gmtOffsetMinutes*60*1000;

		var newRow = chatTable.insertRow(1);
		var newCell = newRow.insertCell(0);

		for (var i=1;i<chatTable.rows.length;i++) {
			var aRow = chatTable.rows[i];
			//GM_log(aRow.innerHTML);
			var addBuffTag = true;
			if (aRow.cells[0].innerHTML) {
				//GM_log(aRow.cells[dateColumn].innerHTML);
				var cellContents = aRow.cells[dateColumn].innerHTML;
				cellContents = cellContents.substring(0,17); // fix for player log screen.
				postDateAsDate = Helper.textDateToDate(cellContents);
				postDateAsLocalMilli = postDateAsDate.getTime() - gmtOffsetMilli;
				postAge = (localDateMilli - postDateAsLocalMilli)/(1000*60);
				if (postDateAsLocalMilli > localLastCheckMilli) {
					aRow.style.backgroundColor = "#F5F298";
				}
				else if (postAge > 20 && postDateAsLocalMilli <= localLastCheckMilli) {
					aRow.style.backgroundColor = "#CD9E4B";
					addBuffTag = false;
				}
				if (logScreen == 'Chat' && addBuffTag) {
					var playerIDRE = /player_id=(\d+)/;
					var playerID = playerIDRE.exec(aRow.cells[1].innerHTML)[1];
					aRow.cells[1].innerHTML += " <a style='color:blue;font-size:10px;' href=\"javascript:openWindow('index.php?cmd=quickbuff&tid=" + playerID +
						"', 'fsQuickBuff', width=618, height=800, 'scrollbars')\">[b]</a>";
			}
		}
		}
		now=(new Date()).getTime()
		GM_setValue(lastCheckScreen, now.toString());
	},

	textDateToDate: function(textDate) {
		timeText = textDate.split(" ")[0];
		dateText = textDate.split(" ")[1];
		dayText = dateText.split("/")[0];
		monthText = dateText.split("/")[1];
		if (monthText == "Jan") {fullMonthText = "January"};
		if (monthText == "Feb") {fullMonthText = "February"};
		if (monthText == "Mar") {fullMonthText = "March"};
		if (monthText == "Apr") {fullMonthText = "April"};
		if (monthText == "May") {fullMonthText = "May"};
		if (monthText == "Jun") {fullMonthText = "June"};
		if (monthText == "Jul") {fullMonthText = "July"};
		if (monthText == "Aug") {fullMonthText = "August"};
		if (monthText == "Sep") {fullMonthText = "September"};
		if (monthText == "Oct") {fullMonthText = "October"};
		if (monthText == "Nov") {fullMonthText = "November"};
		if (monthText == "Dec") {fullMonthText = "December"};
		yearText = dateText.split("/")[2];
		dateAsDate = new Date(fullMonthText + " " + dayText + ", " + yearText + " " + timeText + ":00")
		return dateAsDate;
	},

	addLogWidgets: function() {
		var logTable = calfSystem.findNode("//table[@border='0' and @cellpadding='2' and @width='100%']");
		var memberList = calfSystem.getValueJSON("memberlist");
		if (!memberList) return;
		var memberNameString;
		for (var i=0;i<memberList.members.length;i++) {
			var member=memberList.members[i];
			memberNameString += member.name + " ";
		}
		var isGuildmate = false;
		for (var i=0;i<logTable.rows.length;i++) {
			var aRow = logTable.rows[i];
			if (i != 0) {
				if (aRow.cells[0].innerHTML) {
					firstCell = aRow.cells[0];
					//Valid Types: General, Chat, Guild
					messageType = firstCell.firstChild.getAttribute("title");
					if (messageType == "Chat") {
						var playerName = aRow.cells[2].firstChild.innerHTML;
						if (memberNameString.search(playerName) !=-1) {
							aRow.cells[2].firstChild.style.color="green";
							isGuildmate = true;
						}
						var messageHTML = aRow.cells[2].innerHTML;
						var firstPart = messageHTML.split(">Reply</a>")[0];
						var secondPart = messageHTML.split(">Reply</a>")[1];
						var extraPart = " | <a href='index.php?cmd=trade&target_player=" + playerName + "'>Trade</a> | " +
							"<a title='Secure Trade' href='index.php?cmd=trade&subcmd=createsecure&target_username=" + playerName +
							"'>ST</a>";
						aRow.cells[2].innerHTML = firstPart + ">Reply</a>" + extraPart + secondPart;

						isGuildmate = false;
					}
					if (aRow.cells[2].innerHTML.search("activated") != -1 && aRow.cells[2].getAttribute("width") == "80%") {
						var buffingPlayerIDRE = /player_id=(\d+)/;
						var buffingPlayerID = buffingPlayerIDRE.exec(aRow.cells[2].innerHTML)[1];
						var buffingPlayerName = aRow.cells[2].firstChild.nextSibling.innerHTML;
						aRow.cells[2].innerHTML += " <span style='font-size:x-small;'>[ <a href='index.php?cmd=message&target_player=" + buffingPlayerName +
							"'>Reply</a> | <a href='index.php?cmd=trade&target_player=" + buffingPlayerName +
							"'>Trade</a> | <a title='Secure Trade' href='index.php?cmd=trade&subcmd=createsecure&target_username=" + buffingPlayerName +
							"'>ST</a> | <a href=\"javascript:openWindow('index.php?cmd=quickbuff&tid=" + buffingPlayerID +
							"', 'fsQuickBuff', width=618, height=800, 'scrollbars')\">Buff</a> ]</span>";
				}
			}
			}
			else {
				var messageNameCell = aRow.firstChild.nextSibling.nextSibling.nextSibling;
				messageNameCell.innerHTML += "&nbsp;&nbsp;<span style='color:white;'>(Guild mates show up in <span style='color:green;'>green</span>)</span>"
			}

		}
	},

	addGuildLogWidgets: function() {
		if (!GM_getValue("hideNonPlayerGuildLogMessages")) return;
		var playerIdRE = /sigmastorm2.com\/\?ref=(\d+)/
		var playerId=document.body.innerHTML.match(playerIdRE)[1]*1;
		GM_setValue("playerID",playerId);

		var logTable = calfSystem.findNode("//table[@border='0' and @cellpadding='2' and @width='100%']");
		var hideNextRows = 0;
		for (var i=0;i<logTable.rows.length;i++) {
			var aRow = logTable.rows[i];
			var firstPlayerID = 0;
			var secondPlayerID = 0;
			if (i != 0) {
				if (hideNextRows>0) {
					//aRow.style.display = "none";
					hideNextRows --;
				}
				if (aRow.cells[0].innerHTML) {
					var messageHTML = aRow.cells[2].innerHTML;
					var doublerPlayerMessageRE = /member\s<a\shref="index.php\?cmd=profile\&amp;player_id=(\d+)/
					secondPlayer = doublerPlayerMessageRE.exec(messageHTML);
					var singlePlayerMessageRE = /<a\shref="index.php\?cmd=profile\&amp;player_id=(\d+)/
					firstPlayer = singlePlayerMessageRE.exec(messageHTML);
					if (secondPlayer) {
						firstPlayerID = firstPlayer[1]*1;
						secondPlayerID = secondPlayer[1]*1;
					}
					if (firstPlayer && !secondPlayer) {
						firstPlayerID = firstPlayer[1]*1;
					}
					if (firstPlayerID == playerId || secondPlayerID == playerId) {
					}
					else if (firstPlayer) {
						//aRow.style.display = "none";
						aRow.style.fontSize = "x-small";
						aRow.style.color = "gray";
						hideNextRows = 3;
					}
				}
			}
			else {
				var messageNameCell = aRow.firstChild.nextSibling.nextSibling.nextSibling;
				messageNameCell.innerHTML += "&nbsp;&nbsp;<font style='color:white;'>(Guild Log messages not involving self are dimmed!)</font>"
			}

		}
	},

	injectGuildList: function(memberList) {
		var oldMemberList = calfSystem.getValueJSON("oldmemberlist");
		if (!oldMemberList) oldMemberList=memberList;

		var oldIds=oldMemberList.members
			.filterBy("status", "Online")
			.map(function(element, index, array) {return element.id});

		var playerId = GM_getValue("playerID");
		if (!playerId) {
			var playerIdRE = /\.sigmastorm2.com\/\?ref=(\d+)/
			playerId=document.body.innerHTML.match(playerIdRE)[1];
		}
		GM_setValue("memberlist", JSON.stringify(memberList));
		var injectHere = document.getElementById("Helper:GuildListPlaceholder");
		// injectHere.innerHTML=memberList.length;
		var displayList = document.createElement("TABLE");
		displayList.style.border = "1px solid #c5ad73";
		displayList.style.backgroundColor = (memberList.isRefreshed)?"#6a5938":"#4a3918";
		displayList.cellPadding = 1;
		displayList.width = 125;

		var aRow=displayList.insertRow(displayList.rows.length);
		var aCell=aRow.insertCell(0);
		var output = "<ol style='color:#FFF380;font-size:10px;list-style-type:decimal;margin-left:1px;margin-top:1px;margin-bottom:1px;padding-left:20px;'>Guild Members";
		for (var i=0;i<memberList.members.length;i++) {
			var member=memberList.members[i];
			if (member.status=="Online") {
				if (memberList.isRefreshed) {
					Helper.getFullPlayerData(member);
				}
				output += "<li style='padding-bottom:0px;'>"
				output += "<a style='color:#CCFF99;font-size:10px;' "
				output += "href=\"javascript:openWindow('index.php?cmd=quickbuff&tid=" + member.id + "', 'fsQuickBuff', width=618, height=800, 'scrollbars')\">[b]</a>&nbsp;";
				if (member.id!=playerId) {
					output += "<a style=\"color:#A0CFEC;font-size:10px;\" "
					output += "href=\"" + calfSystem.server + "index.php?cmd=message&target_player=" + member.name + "\">[m]";
					output += "</a>";
				}
				else {
					output += "<span style='color:" + displayList.style.backgroundColor + ";'>[m]</span>";
				}
				output += "&nbsp;<a onmouseover=\"tt_setWidth(105);";
				output += "Tip('<div style=\\'text-align:center;width:105px;\\'><b>" + member.rank + "</b><br/>XP: " + member.xp + "<br/>Lvl: " + member.level + "<br/>";
				if (member.hasFullData) {

				}
				output += "</div>');\" ";
				output += "style='color:"
				if (oldIds.indexOf(member.id)<0 /* || member.justLoggedIn */) { // just logged in
					output += "orange";
					member.loggedIn=new Date().getTime();
					member.lastSeen=new Date().getTime();
					// if (memberList.isRefreshed) {member.justLoggedIn=true; }
				} else {
					output += (member.id==playerId)?"#FFF380":"white";
				}
				output += ";font-size:10px;'"
				output += " href='" + calfSystem.server + "index.php?cmd=profile&player_id=" + member.id + "'>" + member.name + "</a>";
				// output += "<br/>"
				output += "</li>"
			}
			else {
				member.loggedIn=0;
			}
		}
		output += "</ol>";
		aCell.innerHTML = output;
		var breaker=document.createElement("BR");
		injectHere.parentNode.insertBefore(breaker, injectHere.nextSibling);
		injectHere.parentNode.insertBefore(displayList, injectHere.nextSibling);

		if (memberList.isRefreshed) {
			GM_setValue("oldmemberlist", JSON.stringify(memberList));
		}
	},

	getFullPlayerData: function(member) {
		return;
		calfSystem.xmlhttp("index.php?cmd=profile&player_id=" + member.id, function(responseDetails) {Helper.parsePlayerData(member.id, responseDetails.responseText);});
	},

	parsePlayerData: function(memberId, responseText) {
		// return;
		var doc=calfSystem.createDocument(responseText)
		// var statistics = calfSystem.findNode("//table[contains(tr/td/b,'Level:')]",0,doc);
		var statistics = calfSystem.findNode("//table[contains(tbody/tr/td/b,'Level:')]",0,doc);
		var levelNode = calfSystem.findNode("//td[contains(b,'Level:')]",0,statistics);
		var levelValue = levelNode.nextSibling.innerHTML;
		GM_log(levelValue);
		// GM_log(statistics.innerHTML); //parentNode.parentNode.nextSibling.nextSibling.nextSibling.innerHTML);
	},

	injectBank: function() {
		var injectHere;
		var bank = calfSystem.findNode("//b[contains(.,'Bank')]");
		if (bank) {
			bank.innerHTML+="<br><a href='/index.php?cmd=guild&subcmd=bank'>Guild Bank</a>";
		}
	},

	injectAuctionHouse: function() {
		var isAuctionPage = calfSystem.findNode("//td[contains(@background,'header_tradehub.jpg')]");
		var imageCell = isAuctionPage.parentNode;
		var imageHTML = imageCell.innerHTML; //hold on to this for later.

		var auctionTable = calfSystem.findNode("//img[contains(@title,'Auction House')]/../../../..");

		//Add functionality to hide the text block at the top.
		var textRow = auctionTable.rows[2];
		textRow.id = 'auctionTextControl';
		var myBidsButton = calfSystem.findNode("//input[@value='My Bids']/..");
		myBidsButton.innerHTML += " [ <span style='cursor:pointer; text-decoration:underline;' " +
			"id='toggleAuctionTextControl' linkto='auctionTextControl' title='Click on this to Show/Hide the AH text.'>X</span> ]";
		if (GM_getValue("auctionTextControl")) {
			textRow.style.display = "none";
			textRow.style.visibility = "hidden";
		}
		document.getElementById('toggleAuctionTextControl').addEventListener('click', Helper.toggleVisibilty, true);

		//fix button class and add go to first and last
		var prevButton = calfSystem.findNode("//input[@value='<']");
		var nextButton = calfSystem.findNode("//input[@value='>']");
		if (prevButton) {
			prevButton.setAttribute("class", "custombutton");
			var startButton = document.createElement("input");
			startButton.setAttribute("type", "button");
			startButton.setAttribute("onclick", prevButton.getAttribute("onclick").replace(/\&page=[0-9]*/, "&page=1"));
			startButton.setAttribute("class", "custombutton");
			startButton.setAttribute("value", "<<");
			prevButton.parentNode.insertBefore(startButton,prevButton);
		};
		if (nextButton) {
			nextButton.setAttribute("class", "custombutton");
			var lastPageNode=calfSystem.findNode("//input[@value='Go']/../preceding-sibling::td");
			lastPage = lastPageNode.textContent.replace(/\D/g,"");
			var finishButton = document.createElement("input");
			finishButton.setAttribute("type", "button");
			finishButton.setAttribute("onclick", nextButton.getAttribute("onclick").replace(/\&page=[0-9]*/, "&page=" + lastPage));
			finishButton.setAttribute("class", "custombutton");
			finishButton.setAttribute("value", ">>");
			nextButton.parentNode.insertBefore(finishButton, nextButton.nextSibling);
		};

		//insert another page change block at the top of the screen.
		var insertPageChangeBlockHere = auctionTable.rows[5].cells[0];
		var pageChangeBlock = calfSystem.findNode("//input[@name='page' and @class='custominput']/../../../../../..");
		var newPageChangeBlock = pageChangeBlock.innerHTML.replace('</form>','');
		newPageChangeBlock += "</form>"
		var insertPageChangeBlock=document.createElement("SPAN");
		insertPageChangeBlock.innerHTML = newPageChangeBlock;
		insertPageChangeBlockHere.align = "right";
		insertPageChangeBlockHere.appendChild(insertPageChangeBlock);
		var potions = calfSystem.getValueJSON("potions");

		if (!potions) {
			potions = [
				{"searchname":"Potion of the Wise",         "shortname":"Lib 200",   "buff":"Librarian",      "level":200,  "duration":120, "minlevel":5, "bound":true},
				{"searchname":"Potion of the Bookworm",     "shortname":"Lib 225",   "buff":"Librarian",      "level":225,  "duration":90,  "minlevel":5},
				{"searchname":"Potion of Shattering",       "shortname":"SA",        "buff":"Shatter Armor",  "level":150,  "duration":20,  "minlevel":5, "bound":true},
				{"searchname":"Dragons Blood Potion",       "shortname":"ZK 200",    "buff":"Berzerk",        "level":200,  "duration":30,  "minlevel":5, "bound":true},
				{"searchname":"Berserkers Potion",          "shortname":"ZK 300",    "buff":"Berserk",        "level":300,  "duration":45,  "minlevel":5, "bound":true},
				{"searchname":"Potion of Fury",             "shortname":"ZK 350",    "buff":"Berserk",        "level":350,  "duration":60,  "minlevel":5},
				{"searchname":"Sludge Brew",                "shortname":"DC 200",    "buff":"Dark Curse",     "level":200,  "duration":45,  "minlevel":5, "bound":true},
				{"searchname":"Potion of Black Death",      "shortname":"DC 225",    "buff":"Dark Curse",     "level":225,  "duration":60,  "minlevel":5},
				{"searchname":"Potion of Aid",              "shortname":"Assist",    "buff":"Assist",         "level":150,  "duration":30,  "minlevel":5, "bound":true},
				{"searchname":"Potion of Supreme Doubling", "shortname":"DB 450",    "buff":"Doubler",        "level":450,  "duration":00,  "minlevel":5, "bound":true},
				{"searchname":"Potion of Acceleration",     "shortname":"DB 500",    "buff":"Doubler",        "level":500,  "duration":120, "minlevel":5},
				{"searchname":"Potion of Lesser Death Dealer",  "shortname":"DD",    "buff":"Death Dealer",   "level":25,   "duration":45,  "minlevel":20},
				{"searchname":"Runic Potion",               "shortname":"FI 250",    "buff":"Find Item",      "level":250,  "duration":60,  "minlevel":5, "bound":true},
				{"searchname":"Potion of Supreme Luck",     "shortname":"FI 1k",     "buff":"Find Item",      "level":1000, "duration":60,  "minlevel":5, "bound":true},
				{"searchname":"Potion of Truth",            "shortname":"EW 1k",     "buff":"Enchant Weapon", "level":1000, "duration":90,  "minlevel":5, "bound":true},
				{"searchname":"Dull Edge",                  "shortname":"DE 25",     "buff":"Dull Edge",      "level":25,   "duration":60,  "minlevel":1},
				{"searchname":"Notched Blade",              "shortname":"DE 80",     "buff":"Dull Edge",      "level":80,   "duration":45,  "minlevel":10, "bound":true},
				{"searchname":"Potion of Death",            "shortname":"DW 125",    "buff":"Death Wish",     "level":125,  "duration":15,  "minlevel":5, "bound":true},
				{"searchname":"Potion of Decay",            "shortname":"WI 150",    "buff":"Wither",         "level":150,  "duration":15,  "minlevel":5, "bound":true},
				{"searchname":"Potion of Fatality",         "shortname":"WI 350",    "buff":"Wither",         "level":350,  "duration":90,  "minlevel":10, "bound":true},
				{"searchname":"Potion of Annihilation",     "shortname":"DW 150",    "buff":"Death Wish",     "level":150,  "duration":30,  "minlevel":5}
			];
		}

		//GM_log(JSON.stringify(potions));

		var finalHTML = "<span style='font-size:x-small; color:blue;'><table><tbody><tr><td rowspan='7'>" + imageHTML + "</td>" +
			"<td colspan='3' style='text-align:center;color:#7D2252;background-color:#CD9E4B'>Quick Potion Search</td></tr>"
		var lp=0;
		var rowCount = 0;
		for (var p=0;p<potions.length;p++) {
			var pot=potions[p];
			if (lp % 3==0) {
				finalHTML += "<tr>";
				rowCount++;
			}
			if (rowCount == 7 && lp % 3==0) {
				finalHTML += "<td><span style='text-align:center;color:#7D2252;background-color:#CD9E4B'>Quick Plant Search</span>" +
					" <span style='cursor:pointer;text-decoration:underline;color:#7D2252' cat='quickPotionSearch' " +
						"searchtext='Blood Bloom' title='Blood Bloom Plant'>Blood Bloom</span> |" +
					" <span style='cursor:pointer;text-decoration:underline;color:#7D2252' cat='quickPotionSearch' " +
						"searchtext='Jademare' title='Jademare Plant'>Jademare</span> |" +
					" <span style='cursor:pointer;text-decoration:underline;color:#7D2252' cat='quickPotionSearch' " +
						"searchtext='Dark Shade' title='Dark Shade Plant'>Dark Shade</span> |" +
					" <span style='cursor:pointer;text-decoration:underline;color:#7D2252' cat='quickPotionSearch' " +
						"searchtext='Trinettle' title='Trinettle Plant'>Trinettle</span> |" +
					" <span style='cursor:pointer;text-decoration:underline;color:#7D2252' cat='quickPotionSearch' " +
						"searchtext='Heffle Wart' title='Heffle Wart Plant'>Heffle Wart</span> |" +
					" <span style='cursor:pointer;text-decoration:underline;color:#7D2252' cat='quickPotionSearch' " +
						"searchtext='Amber' title='Amber Plant'>Amber</span>" +
					"</td>";
			}
			finalHTML += "<td";
			if (pot.wide) finalHTML+=" colspan='2' "
			finalHTML += "><span style='cursor:pointer;text-decoration:underline;color:#7D2252' cat='quickPotionSearch' searchtext='" +
				pot.searchname + "' title='" +
				pot.buff + " " + pot.level.toString() + "'>" +
				pot.shortname + "</span></td>"
			if (lp % 3==2) finalHTML += "</tr>";
			if (pot.wide) lp++;
			if (lp % 3==2) finalHTML += "</tr>";
			lp++;
		}
		// if (!/</tr>$/.exec(finalHTML)) finalHTML+="</tr>"
		/*
			"<tr><td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Wise' title='Librarian'>Lib 200</span></td>" +
				"<td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Bookworm' title='Librarian'>Lib 225</span></td>" +
				"<td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Shatter' title='Shatter Armor'>SA</span></td></tr>" +
			"<tr><td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Dragons Blood' title='Berserk'>ZK 200</span></td>" +
				"<td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Berserkers' title='Berserk'>ZK 300</span></td>" +
				"<td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Fury' title='Berserk'>ZK 350</span></td></tr>" +
			"<tr><td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Sludge' title='Dark Curse'>DC 200</span></td>" +
				"<td colspan='2'><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Black Death' title='Dark Curse'>DC 225</span></td></tr>" +
			"<tr><td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Doubling' title='Doubler'>DB 450</span></td>" +
				"<td colspan='2'><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Acceleration' title='Doubler'>DB 500</span></td></tr>" +
			"<tr><td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Truth' title='Enchant Weapon'>EW 1000</span></td>" +
				"<td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Death Dealer' title='Death Dealer'>DD</span></td>" +
				"<td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Aid' title='Assist'>Assist</span></td></tr>" +
			"<tr><td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Dull Edge' title='Dull Edge'>Dull Edge</span></td>" +
				"<td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Potion of Death' title='Death Wish'>DW</span></td>" +
				"<td><span style='cursor:pointer; text-decoration:underline;' cat='quickPotionSearch' searchtext='Supreme Luck' title='Find Item'>FI 1000</span></td></tr>" +
			"</tbody></table></span>";
        */
		imageCell.innerHTML = finalHTML;

		//GM_log(imageCell.parentNode.innerHTML);
		var quickSearchList = calfSystem.findNodes("//span[@cat='quickPotionSearch']");
		for (var i=0; i<quickSearchList.length; i++) {
			quickSearchItem = quickSearchList[i];
			quickSearchItem.addEventListener('click', Helper.quickAuctionSearch, true);
		}

		var allItems = document.getElementsByTagName("IMG");
		for (var i=0; i<allItems.length; i++) {
			anItem = allItems[i];
			if (anItem.src.search("items") != -1) {
				var theImage = anItem;
				calfSystem.xmlhttp(Helper.linkFromMouseover(anItem.getAttribute("onmouseover")),
					function(responseDetails, callback) {
						var craft="";
						var responseText=responseDetails.responseText;
						if (responseText.search(/Uncrafted|Very Poor|Poor|Average|Good|Very Good|Excellent|Perfect/) != -1){
							var fontLineRE=/<\/b><\/font><br>([^<]+)<font color='(#[0-9A-F]{6})'>([^<]+)<\/font>/
							var fontLineRX=fontLineRE.exec(responseText)
							craft = fontLineRX[3];
						}
						var forgeCount=0, re=/hellforge\/forgelevel.gif/ig;
						while(re.exec(responseText)) {
							forgeCount++;
						}
						Helper.injectAuctionExtraText(this.callback,craft,forgeCount);
					},
					theImage);
			}
		}
		var minBidLink = calfSystem.findNode("//a[contains(@href,'&order_by=1')]");
		var auctionTable = minBidLink.parentNode.parentNode.parentNode.parentNode;

		var playerIdRE = /\.sigmastorm2.com\/\?ref=(\d+)/
		var playerId = document.body.innerHTML.match(playerIdRE)[1];
		GM_setValue("playerID",playerId);

		var newRow, newCell, bidMinBuyoutCell, buyNowBuyoutCell,winningBidBuyoutCell;
		for (var i=0;i<auctionTable.rows.length;i++) {
			var aRow = auctionTable.rows[i];
			if (i>0 && // the title row - ignore this
				aRow.cells[1]) { // a separator row - ignore this
				if (aRow.cells[5].innerHTML == '<font size="1">[ended]</font>') { //time left column
					aRow.cells[6].innerHTML = ""; // text field and button column
				} else {
					winningBidValue = "-";
					var bidExistsOnItem = false;
					var playerListedItem = false;
					if (aRow.cells[1].innerHTML != '<font size="1">Auction House</font>') {
						var sellerElement = aRow.cells[1].firstChild.firstChild;
						sellerHref = sellerElement.getAttribute("href");
						var sellerIDRE = /player_id=(\d+)/;
						var sellerID = sellerIDRE.exec(sellerHref)[1];
						if (playerId == sellerID) {
							playerListedItem = true;
						}
					}
					if (aRow.cells[3].innerHTML != '<font size="1">-</font>') {
						var winningBidTable = aRow.cells[3].firstChild.firstChild;
						var winningBidCell = winningBidTable.rows[0].cells[0];
						var winningBidValue = winningBidCell.textContent.replace(/,/,"")*1;
						newRow = winningBidTable.insertRow(2);
						winningBidBuyoutCell = newRow.insertCell(0);
						winningBidBuyoutCell.colSpan = "2";
						winningBidBuyoutCell.align = "center";
						var winningBidderHTML = winningBidTable.rows[1].cells[0].innerHTML;
						var winningBidderIDRE = /player_id=(\d+)/;
						var winningBidderID = winningBidderIDRE.exec(winningBidderHTML)[1];
						if (playerId == winningBidderID) {
							playerListedItem = true;
						}
					}
					var bidBuyoutTable = aRow.cells[4].firstChild.firstChild;
					newRow = bidBuyoutTable.insertRow(1);
					bidMinBuyoutCell = newRow.insertCell(0);
					bidMinBuyoutCell.colSpan = "2";
					bidMinBuyoutCell.align = "left";
					// = newRow.insertCell(1);
					newCell = newRow.insertCell(1);
					buyNowBuyoutCell = newRow.insertCell(2);
					buyNowBuyoutCell.colSpan = "2";
					buyNowBuyoutCell.align = "right";
					var bidCell = bidBuyoutTable.rows[0].cells[0];
					var bidValue = bidCell.textContent*1;
					var buyoutCell = bidBuyoutTable.rows[0].cells[3];
					var buyoutHTML = buyoutCell.innerHTML;
					if (winningBidValue != "-" && !bidExistsOnItem && !playerListedItem) {
						var overBid = Math.ceil(winningBidValue * 1.05);
						winningBidBuyoutCell.innerHTML = '<br><span style="color:blue; cursor:pointer; text-decoration:underline;" findme="bidOnItem" linkto="auction' +
							i + 'text" title="Click to overbid last bid value" bidvalue="' + overBid + '">Bid ' + Helper.addCommas(overBid) + '</span>&nbsp';
					}
					if (winningBidValue == "-" && !bidExistsOnItem && !playerListedItem) {
						bidMinBuyoutCell.innerHTML = '<span style="color:blue; cursor:pointer; text-decoration:underline;" findme="bidOnItem" linkto="auction' +
							i + 'text" title="Click to bid on this item" bidvalue="' + bidValue + '">Bid Now</span>&nbsp';
					}
					var buyoutValue = "-";
					if (buyoutHTML != "-" && !playerListedItem) {
						newCell.innerHTML = "&nbsp/&nbsp";
						buyoutValue = (buyoutCell.textContent)*1;
						buyNowBuyoutCell.innerHTML = '&nbsp<span style="color:blue; cursor:pointer; text-decoration:underline;" findme="bidOnItem" linkto="auction' +
							i + 'text" title="Click to buy this item now!" bidvalue="' + buyoutValue + '">Buy Now</span>';
					}
					var inputTable = aRow.cells[6].firstChild.firstChild;
					if (!playerListedItem) {
					var inputCell = inputTable.rows[0].cells[0];
					var textInput = inputCell.firstChild;
					textInput.id = 'auction' + i + 'text';
					}
					var inputText = aRow.cells[6]
				}
			}
		}
		var bidOnItemList = calfSystem.findNodes("//span[@findme='bidOnItem']");
		if (!bidOnItemList) return;
		for (var i=0; i<bidOnItemList.length; i++) {
			bidOnItemItem = bidOnItemList[i];
			bidOnItemItem.addEventListener('click', Helper.bidOnItem, true);
		}
	},

	quickAuctionSearch: function(evt) {
		var searchText = evt.target.getAttribute("searchtext");
		GM_log(searchText);
		var searchInputTextField = calfSystem.findNode("//input[@name='search_text' and @class='custominput']");
		searchInputTextField.value = searchText;
		thisForm = searchInputTextField.form;
		thisForm.submit();
	},

	bidOnItem: function(evt) {
		var bidValue = evt.target.getAttribute("bidvalue");
		var auctionLink = evt.target.getAttribute("linkto");
		var textInput = calfSystem.findNode("//input[@id='" + auctionLink + "']");
		textInput.value = bidValue;
		thisForm = textInput.form;
		thisForm.submit();
	},

	injectAuctionExtraText: function(anItem, craft, forgeCount) {
		var theText=anItem.parentNode.nextSibling.nextSibling;
		var preText = "<span style='color:blue'>" + craft + "</span>";
		if (forgeCount != 0) {
			preText +=  " " + forgeCount + "<img src='" + calfSystem.imageServer + "/hellforge/forgelevel.gif'>"
		}
		theText.innerHTML = preText + "<br>" + theText.innerHTML;
	},

	toggleShowExtraLinks: function(evt) {
		var showExtraLinksElement = calfSystem.findNode("//span[@id='Helper:showExtraLinks']");
		if (showExtraLinksElement.textContent == "Show AH and Sell links") {
			GM_setValue("showExtraLinks", true);
		} else {
			GM_setValue("showExtraLinks", false);
		}
		window.location = window.location;
	},

	injectReportPaint: function() {
		var mainTable = calfSystem.findNode("//table[@width='600']");
		for (var i=0;i<mainTable.rows.length;i++) {
			var aRow = mainTable.rows[i];
			if (aRow.cells[1]) { // itemRow
				var itemCell = aRow.cells[1];
				var itemElement = itemCell.firstChild;
				var href = itemElement.getAttribute("href");
				//GM_log(href);
				var itemIDRE = /recall\&id=(\d+)/
				var itemID = itemIDRE.exec(href)[1];
				var playerIDRE = /player_id=(\d+)/
				var playerID = playerIDRE.exec(href)[1];
				//itemCell.title = itemID;
				//ajaxLoadItem(2758, 84063685, 1, 1346893 - report link
				//ajaxLoadItem(2758, 6569239, 4, 40769 - guild store link
				//unfortunately the itemID for the report link is different than the guild store link so you cannot script
				//grabbing items from the guild store easily with one click.
				itemCell.innerHTML += ' [ <span style="cursor:pointer; text-decoration:underline;" id="recallItem' + itemID + '" ' +
					'itemID="' + itemID + '" ' +
					'playerID="' + playerID + '">Fast Recall</span> ]'
				document.getElementById('recallItem' + itemID).addEventListener('click', Helper.recallItem, true);
			}
		}

		//Get the list of online members
		var memberList = calfSystem.getValueJSON("memberlist");

		var injectHere, searchString;
		for (var i=0;i<memberList.members.length;i++) {
			var member=memberList.members[i];
			if (member.status=="Online") {
				var player=calfSystem.findNode("//b[contains(., '" + member.name + "')]");
				if (player) {
					player.innerHTML = "<span style='font-size:large; color:green;'>[Online]</span> <a href='" +
						calfSystem.server + "index.php?cmd=profile&player_id=" + member.id + "'>" + player.innerHTML + "</a>";
					player.innerHTML += " [ <a href='index.php?cmd=message&target_player=" + member.name + ">m</a> ]";
				}
			}
			else {
				var player=calfSystem.findNode("//b[contains(., '" + member.name + "')]");
				if (player) {
					player.innerHTML = "<a href='" +
						calfSystem.server + "index.php?cmd=profile&player_id=" + member.id + "'>" + player.innerHTML + "</a>";
				}
			}
		}
	},

	recallItem: function(evt) {
		var itemID=evt.target.getAttribute("itemID");
		var playerID=evt.target.getAttribute("playerID");
		calfSystem.xmlhttp("index.php?cmd=guild&subcmd=inventory&subcmd2=recall&id=" + itemID + "&player_id=" + playerID, function(responseDetails) {
				Helper.recallItemReturnMessage(responseDetails, itemID, evt.target);
			});
	},

	recallItemReturnMessage: function(responseDetails, itemID, target) {
		var infoRE=/<center>INFORMATION<\/center><\/font><\/td><\/tr>\t+<tr><td><font size=2 color=\"\#000000\"><center>([^<]+)<\/center>/i;
		var info=responseDetails.responseText.match(infoRE)
		if (info) {info=info[1]} else {info=""};
		var itemCellElement = target.parentNode; //calfSystem.findNode("//td[@title='" + itemID + "']");
		if (info!="") {
			itemCellElement.innerHTML += " <span style='color:lime; font-weight:bold;'>" + info + "</span>";
		} else {
			itemCellElement.innerHTML += " <span style='color:red; font-weight:bold;'>" + info + "</span>";
		}
	},

	injectDropItems: function() {
		var mainTable = calfSystem.findNode("//table[@width='100%']");
		var insertHere = mainTable.rows[5].cells[0];
		insertHere.innerHTML += '<span style="cursor:pointer; text-decoration:underline;" id="Helper:showExtraLinks">' +
			(GM_getValue("showExtraLinks")?'Hide':'Show') + ' AH and Sell links</span>';
		document.getElementById("Helper:showExtraLinks").addEventListener('click', Helper.toggleShowExtraLinks, true);

		//function to add links to all the items in the drop items list
		if (GM_getValue("showExtraLinks")) {
			var itemName, itemInvId, theTextNode, newLink;
			var allItems=calfSystem.findNodes("//input[@type='checkbox']");
			for (var i=0; i<allItems.length; i++) {
				anItem = allItems[i];
				itemInvId = anItem.value;
				theTextNode = calfSystem.findNode("../../td[3]", anItem);
				itemName = theTextNode.innerHTML.replace(/\&nbsp;/i,"");
				var findItems = calfSystem.findNodes("//td[@width='90%' and contains(.,'"+itemName+"')]");
				theTextNode.innerHTML = "<span findme='AH'>[<a href='" + calfSystem.server + "?cmd=auctionhouse&type=-1&search_text="
					+ escape(itemName)
					+ "'>AH</a>]</span> "
					+ "<span findme='Sell'>[<a href='" + calfSystem.server + "index.php?cmd=auctionhouse&subcmd=create2&inv_id=" + itemInvId + "'>"
					+ "Sell</a>]</span> "
					+ theTextNode.innerHTML
					+ ((findItems.length>1)?' [<span findme="checkall" linkto="'+itemName+'" style="text-decoration:underline;cursor:pointer">Check all</span>]':'');
			}
		}

		var checkAllElements = calfSystem.findNodes("//span[@findme='checkall']");
		if (checkAllElements) {
			for (var i=0; i<checkAllElements.length; i++) {
				checkAllElement = checkAllElements[i];
				itemName = checkAllElement.linkto;
				checkAllElement.addEventListener('click', Helper.checkAll, true);
			}
		}

		var allItems = calfSystem.findNodes("//input[@type='checkbox']");
		for (var i=0; i<allItems.length; i++) {
			anItem = allItems[i];
			theLocation=anItem.parentNode.nextSibling.nextSibling;
			theImage=anItem.parentNode.nextSibling.firstChild.firstChild;
			calfSystem.xmlhttp(Helper.linkFromMouseover(theImage.getAttribute("onmouseover")),
				function(responseDetails, callback) {
					Helper.injectDropItemsPaint(responseDetails, this.callback);
				}, theImage);
		}
	},

	checkAll: function(evt){
		var itemName = evt.target.getAttribute("linkto");
		var findItems = calfSystem.findNodes("//td[@width='90%' and contains(.,'"+itemName+"')]");
		for (var i=0; i<findItems.length; i++) {
			var item = findItems[i];
			var checkboxForItem = item.previousSibling.previousSibling.firstChild;
			if (checkboxForItem.checked) {
				checkboxForItem.checked = false;
			} else {
				checkboxForItem.checked = true;
			}

		}
	},

	injectDropItemsPaint: function(responseDetails, callback) {
		var textNode = calfSystem.findNode("../../../td[3]", callback);
		var auctionHouseLink=calfSystem.findNode("span[@findme='AH']", textNode);
		var sellLink=calfSystem.findNode("span[@findme='Sell']", textNode);
		var guildLockedRE = /<center>Guild Locked: <font color="#00FF00">/i;
		if (guildLockedRE.exec(responseDetails.responseText)) {
			if (auctionHouseLink) auctionHouseLink.style.visibility='hidden';
			if (sellLink) sellLink.style.visibility='hidden';
		};
		//<font color='cyan'>Bound (Non-Tradable)</font></b> <font color='orange'>Quest Item </font></center>
		var boundItemRE = /Bound \(Non-Tradable\)/i;
		if (boundItemRE.exec(responseDetails.responseText)) {
			if (auctionHouseLink) auctionHouseLink.style.visibility='hidden';
			if (sellLink) sellLink.style.visibility='hidden';
		};
		if (GM_getValue("disableItemColoring")) return;
		var fontLineRE=/<center><font color='(#[0-9A-F]{6})' size=2>/i;
		var fontLineRX=fontLineRE.exec(responseDetails.responseText)
		textNode.style.color=fontLineRX[1];
	},

	injectProfile: function() {
		var allLinks = document.getElementsByTagName("A");
		for (var i=0; i<allLinks.length; i++) {
			aLink=allLinks[i];
			if (aLink.href.search("cmd=guild&subcmd=view") != -1) {
				var guildIdResult = /guild_id=([0-9]+)/i.exec(aLink.href);
				if (guildIdResult) var guildId = parseInt(guildIdResult[1], 10);
				var warning = document.createElement('span');
				var color = "";
				var changeAppearance = true;
				var relationship = Helper.guildRelationship(aLink.text)
				switch (relationship) {
					case "self":
						var settings="guildSelfMessage";
						break;
					case "friendly":
						var settings="guildFrndMessage";
						break;
					case "old":
						var settings="guildPastMessage";
						break;
					case "enemy":
						var settings="guildEnmyMessage";
						break;
					default:
						changeAppearance = false;
				}
				if (changeAppearance) {
					var settingsAry=GM_getValue(settings).split("|");
					warning.innerHTML="<br/>" + settingsAry[1];
					color = settingsAry[0];
					aLink.parentNode.style.color=color;
					aLink.style.color=color;
					aLink.parentNode.insertBefore(warning, aLink.nextSibling);
				}
			}
		}

		var player = calfSystem.findNode("//textarea[@id='holdtext']");
		var avyrow = calfSystem.findNode("//img[contains(@title, 's Avatar')]");
		var playeridRE = document.URL.match(/player_id=(\d+)/);
		if (playeridRE) var playerid=playeridRE[1];
		var idindex, newhtml;

		if (player) {
			if (!playerid) {
				playerid = player.innerHTML;
				idindex = playerid.indexOf("?ref=") + 5;
				playerid = playerid.substr(idindex);
			}

			var playeravy = avyrow.parentNode.firstChild ;
			while ((playeravy.nodeType == 3)&&(!/\S/.test(playeravy.nodeValue))) {
				playeravy = playeravy.nextSibling ;
			}
			var playername = playeravy.getAttribute("title");
			playeravy.style.borderStyle="none";
			playername = playername.substr(0, playername.indexOf("'s Avatar"));

			var auctiontext = "Go to " + playername + "'s auctions" ;
			var ranktext = "Rank " +playername + "" ;
			var securetradetext = "Create Secure Trade to " + playername;

			newhtml = avyrow.parentNode.innerHTML + "</td></tr><tr><td align='center' colspan='2'>" ;
			newhtml += "<a href='javaScript:quickBuff(" + playerid ;
			newhtml += ");'><img alt='Buff " + playername + "' title='Buff " + playername + "' src=" ;
			newhtml += calfSystem.imageServer + "/skin/realm/icon_action_quickbuff.gif></a>&nbsp;&nbsp;" ;
			newhtml += "<a href='" + calfSystem.server + "index.php?cmd=guild&subcmd=groups&subcmd2=joinall" ;
			newhtml += "');'><img alt='Join All Groups' title='Join All Groups' src=" ;
			newhtml += calfSystem.imageServer + "/skin/icon_action_join.gif></a>&nbsp;&nbsp;" ;
			newhtml += "<a href=" + calfSystem.server + "?cmd=auctionhouse&type=-3&tid=" ;
			newhtml += playerid + '><img alt="' + auctiontext + '" title="' + auctiontext + '" src=';
			newhtml += calfSystem.imageServer + "/skin/gold_button.gif></a>&nbsp;&nbsp;";
			newhtml += "<a href=" + calfSystem.server + "index.php?cmd=trade&subcmd=createsecure&target_username=" ;
			newhtml += playername + '><img alt="' + securetradetext + '" title="' + securetradetext + '" src=';
			newhtml += calfSystem.imageServer + "/temple/2.gif></a>&nbsp;&nbsp;";
			if (relationship == "self" && GM_getValue("showAdmin")) {
				newhtml += "<a href='" + calfSystem.server + "index.php?cmd=guild&subcmd=members&subcmd2=changerank&member_id=" ;
				newhtml += playerid + '><img alt="' + ranktext + '" title="' + ranktext + '" src=';
				newhtml += calfSystem.imageServer + "/guilds/" + guildId + "_mini.jpg></a>" ;
			}
			avyrow.parentNode.innerHTML = newhtml ;
		}

		var isSelfRE=/player_id=/.exec(document.location.search);
		if (!isSelfRE) { // self inventory
			// Allies/Enemies count/total function
			var alliesTotal = GM_getValue("alliestotal");
			var alliesElement = calfSystem.findNode("//b[.='Allies']");
			var alliesParent = alliesElement.parentNode;
			var alliesTable = alliesParent.parentNode.parentNode.parentNode.parentNode.parentNode.nextSibling.nextSibling.nextSibling.nextSibling;
			var numberOfAllies = 0;
			var startIndex = 0;
			while (alliesTable.innerHTML.indexOf("/avatars/", startIndex+1) != -1) {
				numberOfAllies ++;
				startIndex = alliesTable.innerHTML.indexOf("/avatars/",startIndex+1);
			}
			alliesParent.innerHTML += "&nbsp<span style='color:blue'>" + numberOfAllies + "</span>";
			if (alliesTotal) {
				alliesParent.innerHTML += "/<span style='color:blue' findme='alliestotal'>" + alliesTotal + "</span>";
			}
			var enemiesTotal = GM_getValue("enemiestotal");
			var enemiesElement = calfSystem.findNode("//b[.='Enemies']");
			var enemiesParent = enemiesElement.parentNode;
			var enemiesTable = enemiesParent.parentNode.parentNode.parentNode.parentNode.parentNode.nextSibling.nextSibling.nextSibling.nextSibling;
			var numberOfEnemies = 0;
			var startIndex = 0;
			while (enemiesTable.innerHTML.indexOf("/avatars/", startIndex+1) != -1) {
				numberOfEnemies ++;
				startIndex = enemiesTable.innerHTML.indexOf("/avatars/",startIndex+1);
			}
			enemiesParent.innerHTML += "&nbsp<span style='color:blue'>" + numberOfEnemies + "</span>";
			if (enemiesTotal) {
				enemiesParent.innerHTML += "/<span style='color:blue' findme='enemiestotal'>" + enemiesTotal + "</span>";
			}
		}
	},

	injectQuestManager: function() {
		var content=calfSystem.findNode("//table[@width='640']/..");
		content.innerHTML='<table cellspacing="0" cellpadding="0" border="0" width="100%">'+
			'<tr><td colspan="2" nobr bgcolor="#cd9e4b"><b>&nbsp;Quest Manager</b></td></tr>'+
			'<tr><td><b>&nbsp;Show Completed Quests <input id="Helper:showCompletedQuests" type="checkbox"' +
				(GM_getValue("showCompletedQuests")?' checked':'') + '/></b></td></tr>'+
			'</table>' +
			'<div style="font-size:small;" id="Helper:QuestManagerOutput">' +
			'Loading quest book...' +
			'</div>';
		Data.questMatrix();
		Helper.parseQuestBookStart(0);
		// Helper.injectQuestTable();
	},

	parseQuestBookStart: function(questPage) {
		calfSystem.xmlhttp("index.php?cmd=questbook&page=" + questPage, function(responseDetails, callback) {
				Helper.parseQuestBookDone(responseDetails.responseText, this.callback);
			}, {"page": questPage});
	},

	parseQuestBookDone: function(responseText, callback) {
		var questPage=calfSystem.createDocument(responseText);
		var currentPage=callback.page;
		document.getElementById("Helper:QuestManagerOutput").innerHTML+="<br/>Loaded page " + (currentPage+1)
		var pages=calfSystem.findNode("//select[@name='page']", questPage);
		if (!pages) return;

		var questRows=calfSystem.findNodes("//a[contains(@href,'subcmd=viewquest')]/../..", questPage);
		var questStatus = new Array();
		var questHref = new Array();

		for (var i=0; i<questRows.length; i++) {
			var questRow=questRows[i];
			var questPageQuestName = questRow.cells[0].textContent.replace(/  /g," ");
			questStatus[questPageQuestName]=questRow.cells[1].firstChild.getAttribute("title");
			questHref[questPageQuestName]=questRow.cells[0].firstChild.getAttribute("href");
		}

		for (i=0; i<Data.questArray.length; i++) {
			if (questStatus[Data.questArray[i].questName]!=undefined) {
				Data.questArray[i].status=questStatus[Data.questArray[i].questName];
			}
			if (questHref[Data.questArray[i].questName]!=undefined) {
				Data.questArray[i].href=questHref[Data.questArray[i].questName];
			}
		}

		var nextPage=currentPage+1; //pages[currentPage];
		if (nextPage<pages.options.length) {
			Helper.parseQuestBookStart(nextPage)
		}
		else {
			Helper.injectQuestTable();
		}
	},


	injectQuestTable: function() {
		document.getElementById('Helper:QuestManagerOutput').innerHTML=Helper.generateQuestTable();
		var questTable=document.getElementById('Helper:QuestTable');
		for (var i=0; i<questTable.rows[0].cells.length; i++) {
			var cell=questTable.rows[0].cells[i];
			cell.style.textDecoration="underline";
			cell.style.cursor="pointer";
			cell.addEventListener('click', Helper.sortQuestTable, true);
		}
		document.getElementById("Helper:showCompletedQuests").addEventListener('click', Helper.toggleShowHiddenQuests, true);
	},

	toggleShowHiddenQuests: function(evt) {
		GM_setValue("showCompletedQuests", evt.target.checked);
		Helper.injectQuestTable();
	},

	sortQuestTable: function(evt) {
		var headerClicked=evt.target.getAttribute("sortKey")

		if (Helper.sortAsc==undefined) Helper.sortAsc=true;
		if (Helper.sortBy && Helper.sortBy==headerClicked) {
			Helper.sortAsc=!Helper.sortAsc;
		}
		Helper.sortBy=headerClicked;

		GM_log(headerClicked)

		if (headerClicked=="level") {
			Data.questArray.sort(Helper.numberSort);
		}
		else if (headerClicked=="status") {
			Data.questArray.sort(Helper.questStatusSort);
		}
		else {
			Data.questArray.sort(Helper.stringSort);
		}
		Helper.injectQuestTable();
	},

	generateQuestTable: function() {
		var quests = Data.questMatrix();
		var q, bgColor;
		//GM_log(Helper.characterLevel);
		var hideQuests=[];
		if (GM_getValue("hideQuests")) hideQuests=GM_getValue("hideQuestNames").split(",");
		var output='<br/><table border=0 cellpadding=0 cellspacing=0 width=100% id="Helper:QuestTable">';
		output += '<tr style="background-color:#cd9e4b;"><th sortkey="questName">Name</th><th></th><th sortKey="level">Level</th><th></th>' +
			'<th sortKey="location">Location</th><th sortKey="status">Status</th></tr>';
		var c=0;
		for (var i=0;i<quests.length;i++) {
			q = quests[i];
			if (hideQuests.indexOf(q.questName)<0) {
				var img="";
				// if (q.status==undefined) img="";
				if (q.status=="Completed") img=calfSystem.imageServer + "/skin/quest_complete.gif";
				if (q.status=="Incomplete") img=calfSystem.imageServer + "/skin/quest_incomplete.gif";
				if (q.status==undefined) img='data:image/png;base64,' +
					'iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAAC5UlEQVR4nG1UX2sT' +
					'QRD/7V5yub0kUi4mFFJfWq2i2Jb+0bZYoX2wgk+C6IvfwQf9AH4HP4KCgopvglIK' +
					'FqVafFPf1AdFH7TpH2huzzTJOrObi6npcHd7Nzvzm5nfzJ54dmfWAHSRNPdbcCLQ' +
					'K81mA4FSHZv9Q2wE6ZsQj2/NmEfr30jRhtfYRU427LbOVpyd+efXSBp9MH5G2vX6' +
					'hRFknKqNqwsnugaNuNUN7ivPIdIlpQ/f9/qCPFz5YBWSgYxpkWEW/6wOFwYSgXS3' +
					'cqsX+uTftn6Zrj9HFh1Ao+1S/bjRBxgvX+4J2knNGLoIjB+s9H2J/VbbbZBm6NMG' +
					'Lq3u9IG9XBrA3sUlSOXb74znAIUQ9J7NwXgZ+mAyiQ8VIFpfs0Ds+L+k+k0C1DpG' +
					'QkXkvCxkwU8bQBpuvU5QePG86/BrfM5WEh6hPbqSLZdZuv99ZhY5lXKsuAExlRUc' +
					'yr3IGghXDba3YgvYK4YDIY/E5hO7zJQlkrILBTanz9uov8/Nwfwx2K3HKH9eR+GQ' +
					'MtnFBXANy/CXChXlprATUwwVYm95EbomEA0GqHTK7m2ABaJEozAtgfxVxGCaiNQ2' +
					'1YA2ueCdGiXJhsHBLrJwJ+uxQT4kNCpRp5yTSK460dopaD+xJdNt6kSUPsDR5vSi' +
					'XUslblbe+qRVJuz59PaEebDyFdeuTDmQ9OBxYFGH8AKU3r6ynZXFgAcKQRQg+UG1' +
					'SDYK8eTNe9ycP41Moo0dC6YrJNtY1xGqvAUCraW11QOk28qTxAbV2vbR8s2ZSTsO' +
					'VGYUKctZyA/bpTxcz/tlKx0TIt5OOwPSu+T/FOMNDASdKJ122/NaR21hyQ3wxBy2' +
					'f9awTTwKuvk9HTttj6Smbgo3Dvfuv6bXxJ2E7gBpeG2Gp3/buy9oSdGz55g3JnBl' +
					'k3g35gfvniyXMTUcYGykirGjObeWaR2u4sxQEacGQ0wer+DssYj0RdIXMVqpYJLW' +
					'8UoB46NVYqqFv5bkGr3XAAPaAAAAAElFTkSuQmCC'
				if ( (q.status!="Completed" || GM_getValue("showCompletedQuests")) && q.level<=Helper.characterLevel) {
					bgColor = ((c++)%2==0)?"#e2b960":"#e7c473";
					output+='<tr style="background-color:' + bgColor + '"><td>';
					if (q.href!=undefined) {
						output+= '<a href="' + q.href + '">' + q.questName + '</a>';
					} else {
						output+= q.questName;
					}
					var fsgQuestName = q.questName.replace(/  /g,"+");
					fsgQuestName = fsgQuestName.replace(/ /g,"+");
					var wikiQuestName = q.questName.replace(/  /g,"_");
					wikiQuestName = wikiQuestName.replace(/ /g,"_");
					output+= '</td><td><a href="http://www.fallenswordguide.com/quests/index.php?realm=0&search=' + fsgQuestName +
							'" target="_blank" title="Look up this quest on Fallen Sword Guide">f</a>' +
							'&nbsp<a href="http://wiki.sigmastorm2.com/index.php/' + wikiQuestName +
							'" target="_blank" title="Look up this quest on the wiki">w</a>' +
						'</td><td align="right">' + q.level +
						'</td><td width="20"></td><td>' + q.location + '</td><td align="right"><img src="' + img + '"></td></tr>';
				}
			}
		}
		output+='</table>';
		return output;
	},

	linkFromMouseover: function(mouseOver) {
		var reParams=/(\d+),\s*(\d+),\s*(\d+),\s*(\d+)/;
		var reResult=reParams.exec(mouseOver);
		var itemId=reResult[1];
		var invId=reResult[2];
		var type=reResult[3];
		var pid=reResult[4];
		var theUrl = "fetchitem.php?item_id=" + itemId + "&inv_id=" + invId + "&t="+type + "&p="+pid
		theUrl = calfSystem.server + theUrl;
		return theUrl
	},

	linkFromMouseoverCustom: function(mouseOver) {
		var reParams =/(\d+),\s*(-?\d+),\s*(\d+),\s*(\d+),\s*\'([a-z0-9]+)\'/i;
		var reResult =reParams.exec(mouseOver);
		var itemId   = reResult[1];
		var invId    = reResult[2];
		var type     = reResult[3];
		var pid      = reResult[4];
		var vcode    = reResult[5];
		var theUrl   = "fetchitem.php?item_id=" + itemId + "&inv_id=" + invId + "&t="+type + "&p=" + pid + "&vcode=" + vcode
		theUrl = calfSystem.server + theUrl;
		return theUrl
	},


	injectInventoryManager: function() {
		var content=calfSystem.findNode("//table[@width='640']/..");
		Helper.inventory=calfSystem.getValueJSON("inventory");
		content.innerHTML='<table cellspacing="0" cellpadding="0" border="0" width="100%"><tr style="background-color:#cd9e4b">'+
			'<td width="90%" nobr><b>&nbsp;Inventory Manager</b> green = worn, blue = backpack</td>'+
			'<td width="10%" nobr style="font-size:x-small;text-align:right">[<span id="Helper:InventoryManagerRefresh" style="text-decoration:underline;cursor:pointer">Refresh</span>]</td>'+
			'</tr>' +
			'<tr><td><b>&nbsp;Show Only Useable Items<input id="Helper:showUseableItems" type="checkbox"' +
				(GM_getValue("showUseableItems")?' checked':'') + '/></b></td></tr>'+
			'</table>' +
			'<div style="font-size:small;" id="Helper:InventoryManagerOutput">' +
			'' +
			'</div>';
		document.getElementById("Helper:InventoryManagerRefresh").addEventListener('click', Helper.parseProfileStart, true);
		Helper.generateInventoryTable("self");
		document.getElementById("Helper:showUseableItems").addEventListener('click', Helper.toggleShowUseableItems, true);
	},

	injectGuildInventoryManager: function() {
		var content=calfSystem.findNode("//table[@width='640']/..");
		var guildItemCount = "unknown"
		Helper.guildinventory=calfSystem.getValueJSON("guildinventory");
		if (Helper.guildinventory) guildItemCount = Helper.guildinventory.items.length;
		content.innerHTML='<table cellspacing="0" cellpadding="0" border="0" width="100%"><tr style="background-color:#cd9e4b">'+
			'<td width="90%" nobr><b>&nbsp;Guild Inventory Manager</b> (takes a while to refresh so only do it if you really need to)</td>'+
			'<td width="10%" nobr style="font-size:x-small;text-align:right">[<span id="Helper:GuildInventoryManagerRefresh" style="text-decoration:underline;cursor:pointer">Refresh</span>]</td>'+
			'</tr>' +
			'<tr><td><b>&nbsp;Show Only Useable Items<input id="Helper:showUseableItems" type="checkbox" linkto="showUseableItems"' +
				(GM_getValue("showUseableItems")?' checked':'') + '/></b>&nbsp;Guild Item Count:&nbsp;' + guildItemCount +
				'</td></tr>'+
			'</table>' +
			'<div style="font-size:small;" id="Helper:GuildInventoryManagerOutput">' +
			'' +
			'</div>';
		document.getElementById("Helper:GuildInventoryManagerRefresh").addEventListener('click', Helper.parseGuildStart, true);
		Helper.generateInventoryTable("guild");
		document.getElementById("Helper:showUseableItems").addEventListener('click', Helper.toggleShowUseableItems, true);
	},

	toggleShowUseableItems: function(evt) {
		GM_setValue("showUseableItems", evt.target.checked);
		window.location=window.location;
	},

	parseProfileStart: function(){
		Helper.inventory = new Object;
		Helper.inventory.items = new Array();
		var output=document.getElementById('Helper:InventoryManagerOutput')
		output.innerHTML='<br/>Parsing profile...';
		calfSystem.xmlhttp('index.php?cmd=profile', function(responseDetails) {Helper.parseProfileDone(responseDetails.responseText);})
	},

	parseProfileDone: function(responseText) {
		var doc=calfSystem.createDocument(responseText);
		var output=document.getElementById('Helper:InventoryManagerOutput');
		var currentlyWorn=calfSystem.findNodes("//a[contains(@href,'subcmd=unequipitem') and contains(img/@src,'/items/')]/img", doc);
		for (var i=0; i<currentlyWorn.length; i++) {
			var item={"url": Helper.linkFromMouseover(currentlyWorn[i].getAttribute("onmouseover")),
				"type":"worn", "index":(i+1),
				"onmouseover":currentlyWorn[i].getAttribute("onmouseover")};
			if (i==0) output.innerHTML+="<br/>Found worn item "
			output.innerHTML+=(i+1) + " ";
			Helper.inventory.items.push(item);
		}
		var	folderIDs = new Array();
		Helper.folderIDs = folderIDs; //clear out the array before starting.
		GM_setValue("currentFolder", 1);
		var folderLinks = calfSystem.findNodes("//a[contains(@href,'index.php?cmd=profile&folder_id=')]", doc);
		//if folders are enabled then save the ID's in an array
		if (folderLinks) {
			for (var i=0; i<folderLinks.length;i++) {
				folderLink = folderLinks[i];
				href = folderLink.getAttribute("href")
				var folderID = /folder_id=([-0-9]+)/.exec(href)[1]*1;
				folderIDs.push(folderID);
				Helper.folderIDs = folderIDs;
			}
		}
		Helper.parseInventoryPage(responseText);
	},

	parseInventoryPage: function(responseText) {
		var doc=calfSystem.createDocument(responseText);
		var output=document.getElementById('Helper:InventoryManagerOutput');
		var backpackItems = calfSystem.findNodes("//td[contains(@background,'2x3.gif')]/center/a[contains(@href, 'subcmd=equipitem')]/img", doc);
		var pages = calfSystem.findNodes("//a[contains(@href,'index.php?cmd=profile&backpack_page=')]", doc);
		var pageElement = calfSystem.findNode("//a[contains(@href,'backpack_page=')]/font", doc);
		var currentPage = 1;
		if (pageElement) currentPage = parseInt(calfSystem.findNode("//a[contains(@href,'backpack_page=')]/font", doc).textContent);
		var currentFolder = GM_getValue("currentFolder");
		var folderCount = 0, folderID = -1;
		if (Helper.folderIDs.length<=1) {
			folderCount = 1;
			folderID = -1;
		} else {
			folderCount = Helper.folderIDs.length;
			folderID = Helper.folderIDs[currentFolder-1];
		}
		if (backpackItems) {
			output.innerHTML+='<br/>Parsing folder '+currentFolder+', backpack page '+currentPage+'...';

			for (var i=0; i<backpackItems.length;i++) {
				var theUrl=Helper.linkFromMouseover(backpackItems[i].getAttribute("onmouseover"))
				var item={"url": theUrl,
					"type":"backpack", "index":(i+1), "page":currentPage,
					"onmouseover":backpackItems[i].getAttribute("onmouseover")};
				if (i==0) output.innerHTML+="<br/>Found wearable item "
				output.innerHTML+=(i+1) + " ";
				Helper.inventory.items.push(item);
			}
			} else {
				output.innerHTML+='<br/>Parsing folder '+currentFolder+', backpack page '+currentPage+'... Empty';
			}
		if (currentPage<pages.length || currentFolder<folderCount) {
			if (currentPage==pages.length && currentFolder<folderCount) {
				currentPage = 0;
				folderID = Helper.folderIDs[currentFolder];
				GM_setValue("currentFolder", currentFolder+1);
			}
			calfSystem.xmlhttp('index.php?cmd=profile&backpack_page='+(currentPage)+'&folder_id='+(folderID),
				function(responseDetails) {Helper.parseInventoryPage(responseDetails.responseText);});
		}
		else {
			output.innerHTML+="<br/>Parsing inventory item "
			Helper.retrieveInventoryItem(0, "self");
		}
	},

	parseGuildStart: function(){
		Helper.guildinventory = new Object;
		Helper.guildinventory.items = new Array();
		var output=document.getElementById('Helper:GuildInventoryManagerOutput')
		output.innerHTML='<br/>Parsing guild store ...';
		calfSystem.xmlhttp('index.php?cmd=guild&subcmd=manage&guildstore_page=0', function(responseDetails) {Helper.parseGuildStorePage(responseDetails.responseText);});
	},

	parseGuildStorePage: function(responseText) {
		var doc=calfSystem.createDocument(responseText);
		var output=document.getElementById('Helper:GuildInventoryManagerOutput');
		var guildstoreItems = calfSystem.findNodes("//a[contains(@href,'subcmd2=takeitem')]/img", doc);
		var pages = calfSystem.findNodes("//a[contains(@href,'cmd=guild&subcmd=manage&guildstore_page')]", doc);
		var currentPage = parseInt(calfSystem.findNode("//a[contains(@href,'cmd=guild&subcmd=manage&guildstore_page')]/font", doc).textContent);
		if (guildstoreItems) {
			output.innerHTML+='<br/>Parsing guild store page '+currentPage+'...';

			for (var i=0; i<guildstoreItems.length;i++) {
				var theUrl=Helper.linkFromMouseover(guildstoreItems[i].getAttribute("onmouseover"))
				var item={"url": theUrl,
					"type":"guildstore", "index":(i+1), "page":currentPage, "worn":false,
					"onmouseover":guildstoreItems[i].getAttribute("onmouseover")};
				if (i==0) output.innerHTML+="<br/>Found guild store item "
				output.innerHTML+=(i+1) + " ";
				Helper.guildinventory.items.push(item);
			}
		} else {
			output.innerHTML+='<br/>Parsing guild store page '+currentPage+'... Empty';
		}
		if (currentPage<pages.length) {
			calfSystem.xmlhttp('index.php?cmd=guild&subcmd=manage&guildstore_page='+(currentPage), function(responseDetails) {Helper.parseGuildStorePage(responseDetails.responseText);});
		}
		else {
			output.innerHTML+='<br/>Parsing guild report page ...';
			calfSystem.xmlhttp('index.php?cmd=guild&subcmd=inventory&subcmd2=report', function(responseDetails) {Helper.parseGuildReportPage(responseDetails.responseText);})
		}
	},

	parseGuildReportPage: function(responseText) {
		var doc=calfSystem.createDocument(responseText);
		var output=document.getElementById('Helper:GuildInventoryManagerOutput');
		var guildreportItems = calfSystem.findNodes("//img[contains(@src,'items')]", doc);
		if (guildreportItems) {
			for (var i=0; i<guildreportItems.length;i++) {
				var theUrl=Helper.linkFromMouseover(guildreportItems[i].getAttribute("onmouseover"))
				var item={"url": theUrl,
					"type":"guildreport", "index":(i+1), "worn":false,
					"onmouseover":guildreportItems[i].getAttribute("onmouseover")};
				if (i==0) output.innerHTML+="<br/>Found guild report item "
				output.innerHTML+=(i+1) + " ";
				Helper.guildinventory.items.push(item);
			}
		}
		output.innerHTML+="<br/>Parsing guild inventory item "
		Helper.retrieveInventoryItem(0, "guild");
	},

	retrieveInventoryItem: function(invIndex, reporttype) {
		if (reporttype == "guild") {
			targetInventory = Helper.guildinventory;
		} else {
			targetInventory = Helper.inventory;
		}
		calfSystem.xmlhttp(targetInventory.items[invIndex].url, function(responseDetails) {Helper.parseInventoryItem(responseDetails.responseText, this.callback, reporttype);}, {"invIndex": invIndex});
	},

	parseInventoryItem: function(responseText, callback, reporttype) {
		if (reporttype == "guild") {
			targetId = 'Helper:GuildInventoryManagerOutput';
			targetInventory = Helper.guildinventory;
		} else {
			targetId = 'Helper:InventoryManagerOutput';
			targetInventory = Helper.inventory;
		}
		var output=document.getElementById(targetId);
		var doc=calfSystem.createDocument(responseText);
		output.innerHTML+=(callback.invIndex+1) + " ";

		targetInventory.items[callback.invIndex].html=responseText;

		var nameNode=calfSystem.findNode("//b", doc);
if (!nameNode) GM_log(responseText);
		if (nameNode) {
			targetInventory.items[callback.invIndex].name=nameNode.textContent

			var attackNode=calfSystem.findNode("//tr/td[.='Attack:']/../td[2]", doc);
			targetInventory.items[callback.invIndex].attack=(attackNode)?parseInt(attackNode.textContent):0;

			var defenseNode=calfSystem.findNode("//tr/td[.='Defense:']/../td[2]", doc);
			targetInventory.items[callback.invIndex].defense=(defenseNode)?parseInt(defenseNode.textContent):0;

			var armorNode=calfSystem.findNode("//tr/td[.='Armor:']/../td[2]", doc);
			targetInventory.items[callback.invIndex].armor=(armorNode)?parseInt(armorNode.textContent):0;

			var damageNode=calfSystem.findNode("//tr/td[.='Damage:']/../td[2]", doc);
			targetInventory.items[callback.invIndex].damage=(damageNode)?parseInt(damageNode.textContent):0;

			var levelNode=calfSystem.findNode("//tr[td='Min Level:']/td[2]", doc);
			targetInventory.items[callback.invIndex].minLevel=(levelNode)?parseInt(levelNode.textContent):0;

			var forgeCount=0, re=/hellforge\/forgelevel.gif/ig;
			while(re.exec(responseText)) {
				forgeCount++;
			}
			targetInventory.items[callback.invIndex].forgelevel=forgeCount;

			var craft="";
			if (responseText.search(/Uncrafted|Very Poor|Poor|Average|Good|Very Good|Excellent|Perfect/) != -1){
				var fontLineRE=/<\/b><\/font><br>([^<]+)<font color='(#[0-9A-F]{6})'>([^<]+)<\/font>/
				var fontLineRX=fontLineRE.exec(responseText)
				craft = fontLineRX[3];
			}
			targetInventory.items[callback.invIndex].craftlevel=craft;
		}

		if (callback.invIndex<targetInventory.items.length-1) {
			Helper.retrieveInventoryItem(callback.invIndex+1, reporttype);
		}
		else {
			output.innerHTML+="Parsing done!";
			Helper.generateInventoryTable(reporttype);
		}
	},

	generateInventoryTable: function(reporttype) {
		if (reporttype == "guild") {
			targetId = 'Helper:GuildInventoryManagerOutput';
			targetInventory = Helper.guildinventory;
			inventoryShell = 'guildinventory';
		} else {
			targetId = 'Helper:InventoryManagerOutput';
			targetInventory = Helper.inventory;
			inventoryShell = 'inventory';
		}
		if (!targetInventory) return;
		var output=document.getElementById(targetId);
		var result='<table id="Helper:InventoryTable"><tr>' +
			'<th width="10"></th><th width="180" align="left" sortkey="name">Name</th>' +
			'<th width="10"></th><th sortkey="minLevel">Level</th>' +
			'<th width="10"></th><th sortkey="attack">Att</th>' +
			'<th width="10"></th><th sortkey="defense">Def</th>' +
			'<th width="10"></th><th sortkey="armor">Arm</th>' +
			'<th width="10"></th><th sortkey="damage">Dam</th>' +
			'<th width="10"></th><th sortkey="forgelevel">Forge</th>' +
			'<th width="10"></th><th sortkey="craftlevel">Craft</th>' +
			'<th width="10"></th>';
		var item, color;
		var showUseableItems = GM_getValue("showUseableItems");
		for (var i=0; i<targetInventory.items.length;i++) {
			item=targetInventory.items[i];
			color='black'
			if (item.type=="worn") color='green';
			if (item.type=="backpack") color='blue';

			if (showUseableItems && item.minLevel > Helper.characterLevel) {
			} else {
				result+='<tr style="color:'+ color +'">' +
					'<td>' + '<img src="' + calfSystem.imageServer + '/temple/1.gif" onmouseover="' + item.onmouseover + '">' +
					'</td><td>' + item.name + '</td>' +
					'<td></td><td align="right">' + item.minLevel + '</td>' +
					'<td></td><td align="right">' + item.attack + '</td>' +
					'<td></td><td align="right">' + item.defense + '</td>' +
					'<td></td><td align="right">' + item.armor + '</td>' +
					'<td></td><td align="right">' + item.damage + '</td>' +
					'<td></td><td align="right">' + item.forgelevel + '</td>' +
					'<td>' + ((item.forgelevel>0)? "<img src='" + calfSystem.imageServer + "/hellforge/forgelevel.gif'>":"") + '</td>' +
						'<td align="right">' + item.craftlevel + '</td>' +
					'<td></td>' +
					'</tr>';
			}
		}
		result+='</table>';
		output.innerHTML=result;

		targetInventory.lastUpdate = (new Date()).getTime();
		GM_setValue(inventoryShell, JSON.stringify(targetInventory));

		var inventoryTable=document.getElementById('Helper:InventoryTable');
		for (var i=0; i<inventoryTable.rows[0].cells.length; i++) {
			var cell=inventoryTable.rows[0].cells[i];
			cell.style.textDecoration="underline";
			cell.style.cursor="pointer";
			cell.addEventListener('click', Helper.sortInventoryTable, true);
		}
	},

	sortInventoryTable: function(evt) {
		re=/subcmd=([a-z]+)/;
		var subPageIdRE = re.exec(document.location.search);
		var subPageId="-";
		if (subPageIdRE)
			subPageId=subPageIdRE[1];
		if (subPageId == "guildinvmanager") {
			Helper.guildinventory=calfSystem.getValueJSON("guildinventory");
			targetInventory = Helper.guildinventory;
		} else {
			Helper.inventory=calfSystem.getValueJSON("inventory");
			targetInventory = Helper.inventory;
		}
		var headerClicked=evt.target.getAttribute("sortKey")
		if (Helper.sortAsc==undefined) Helper.sortAsc=true;
		if (Helper.sortBy && Helper.sortBy==headerClicked) {
			Helper.sortAsc=!Helper.sortAsc;
		}
		Helper.sortBy="name";
		targetInventory.items.sort(Helper.stringSort)
		Helper.sortBy=headerClicked;
		//GM_log(headerClicked)
		if (headerClicked=="minLevel" || headerClicked=="attack" || headerClicked=="defense" ||
			headerClicked=="armor" || headerClicked=="damage" || headerClicked=="forgelevel") {
			targetInventory.items.sort(Helper.numberSort)
		}
		else {
			targetInventory.items.sort(Helper.stringSort)
		}
		if (subPageId == "guildinvmanager") {
			Helper.generateInventoryTable("guild");
		} else {
			Helper.generateInventoryTable("self");
		}
	},

	injectRecipeManager: function() {
		var content=calfSystem.findNode("//table[@width='640']/..");
		Helper.recipebook=calfSystem.getValueJSON("recipebook");
		content.innerHTML='<table cellspacing="0" cellpadding="0" border="0" width="100%"><tr style="background-color:#cd9e4b">'+
			'<td width="90%" nobr><b>&nbsp;Recipe Manager</b></td>'+
			'<td width="10%" nobr style="font-size:x-small;text-align:right">[<span id="Helper:RecipeManagerRefresh" style="text-decoration:underline;cursor:pointer">Refresh</span>]</td>'+
			'</tr>' +
			'</table>' +
			'<div style="font-size:small;" id="Helper:RecipeManagerOutput">' +
			'' +
			'</div>';
		document.getElementById("Helper:RecipeManagerRefresh").addEventListener('click', Helper.parseInventingStart, true);
		Helper.generateRecipeTable();
	},

	parseInventingStart: function(){
		Helper.recipebook = new Object;
		Helper.recipebook.recipe = new Array();
		var output=document.getElementById('Helper:RecipeManagerOutput')
		output.innerHTML='<br/>Parsing inventing screen ...';
		calfSystem.xmlhttp('index.php?cmd=inventing&subcmd=&subcmd2=&page=0&search_text=', function(responseDetails, callback) {
				Helper.parseInventingPage(responseDetails.responseText, this.callback);
			}, {"page": 0});
	},

	parseInventingPage: function(responseText, callback) {
		var doc=calfSystem.createDocument(responseText);
		var output=document.getElementById('Helper:RecipeManagerOutput');
		var currentPage = callback.page;
		var pages=calfSystem.findNode("//select[@name='page']", doc);
		if (!pages) return;
		var recipeTable = calfSystem.findNode("//table[tbody/tr/td[.='Recipe Name']]",doc);

		output.innerHTML+='Parsing page: '+currentPage +'...<br>';

		if (recipeTable) {
			for (var i=0; i<recipeTable.rows.length;i++) {
				if (i!=0 && recipeTable.rows[i].cells[0].innerHTML.search("recipe") != -1) {
					aRow = recipeTable.rows[i];
					var innerTable = aRow.firstChild.firstChild;
					var recipeImg = innerTable.rows[0].cells[0].innerHTML;
					var recipeLink = innerTable.rows[0].cells[1].innerHTML;
					var recipeName = innerTable.rows[0].cells[1].firstChild.innerHTML;
					var recipe={
						"img": recipeImg,
						"link": recipeLink,
						"name":recipeName};
					output.innerHTML+="Found recipe: "+ recipeName +"<br>";
					Helper.recipebook.recipe.push(recipe);
				}
			}
		}

		var nextPage=currentPage+1; //pages[currentPage];
		if (nextPage<pages.options.length) {
			calfSystem.xmlhttp('index.php?cmd=inventing&page='+nextPage, function(responseDetails, callback) {Helper.parseInventingPage(responseDetails.responseText, this.callback);});
		}
		else {
			output.innerHTML+='Finished parsing ... formatting ...';
			Helper.generateRecipeTable();
		}
	},

	generateRecipeTable: function() {
		var output=document.getElementById('Helper:RecipeManagerOutput');
		var result='<table id="Helper:RecipeTable"><tr>' +
			'<th width="10"></th><th align="left" sortkey="img"></th>' +
			'<th width="10"></th><th align="left" sortkey="name">Name</th>' +
			'<th width="10"></th>';

		var hideRecipes=[];
		if (GM_getValue("hideRecipes")) hideRecipes=GM_getValue("hideRecipeNames").split(",");

		var recipe;
		for (var i=0; i<Helper.recipebook.recipe.length;i++) {
			recipe=Helper.recipebook.recipe[i];

			if (hideRecipes.indexOf(recipe.name) == -1) {
				result+='<tr>' +
					'<td></td><td>' + recipe.img + '</td>' +
					'<td></td><td>' + recipe.link + '</td>' +
					'<td></td>' +
					'</tr>';
			}
		}
		result+='</table>';
		output.innerHTML=result;

		Helper.recipebook.lastUpdate = (new Date()).getTime();
		GM_setValue("recipebook", JSON.stringify(Helper.recipebook));

		var recipeTable=document.getElementById('Helper:RecipeTable');
		for (var i=0; i<recipeTable.rows[0].cells.length; i++) {
			var cell=recipeTable.rows[0].cells[i];
			cell.style.textDecoration="underline";
			cell.style.cursor="pointer";
			cell.addEventListener('click', Helper.sortRecipeTable, true);
		}
	},

	sortRecipeTable: function(evt) {
		Helper.recipebook=calfSystem.getValueJSON("recipebook");
		var headerClicked=evt.target.getAttribute("sortKey")
		if (Helper.sortAsc==undefined) Helper.sortAsc=true;
		if (Helper.sortBy && Helper.sortBy==headerClicked) {
			Helper.sortAsc=!Helper.sortAsc;
		}
		Helper.sortBy=headerClicked;
		//GM_log(headerClicked)
		Helper.recipebook.recipe.sort(Helper.stringSort)
		Helper.generateRecipeTable();
	},

	injectGroupStats: function() {
		var attackTitleElement = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Attack:')]");
		attackValueElement = attackTitleElement.nextSibling;
		attackValueElement.innerHTML = "<table><tbody><tr><td style='color:blue;'>" + attackValueElement.innerHTML +
			"</td><td>(</td><td title='attackValue'>" + attackValueElement.innerHTML +
			"</td><td>)</td></tr></tbody></table>";
		var defenseTitleElement = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Defense:')]");
		defenseValueElement = defenseTitleElement.nextSibling;
		defenseValueElement.innerHTML = "<table><tbody><tr><td style='color:blue;'>" + defenseValueElement.innerHTML +
			"</td><td>(</td><td title='defenseValue'>" + defenseValueElement.innerHTML +
			"</td><td>)</td></tr></tbody></table>";
		var armorTitleElement = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Armor:')]");
		armorValueElement = armorTitleElement.nextSibling;
		armorValueElement.innerHTML = "<table><tbody><tr><td style='color:blue;'>" + armorValueElement.innerHTML +
			"</td><td>(</td><td title='armorValue'>" + armorValueElement.innerHTML +
			"</td><td>)</td></tr></tbody></table>";
		var damageTitleElement = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'Damage:')]");
		damageValueElement = damageTitleElement.nextSibling;
		damageValueElement.innerHTML = "<table><tbody><tr><td style='color:blue;'>" + damageValueElement.innerHTML +
			"</td><td>(</td><td title='damageValue'>" + damageValueElement.innerHTML +
			"</td><td>)</td></tr></tbody></table>";
		var hpTitleElement = calfSystem.findNode("//table[@width='400']/tbody/tr/td[contains(.,'HP:')]");
		hpValueElement = hpTitleElement.nextSibling;
		hpValueElement.innerHTML = "<table><tbody><tr><td style='color:blue;'>" + hpValueElement.innerHTML +
			"</td><td>(</td><td title='hpValue'>" + hpValueElement.innerHTML +
			"</td><td>)</td></tr></tbody></table>";
		calfSystem.xmlhttp("index.php?cmd=guild&subcmd=mercs", function(responseDetails) {
				Helper.parseMercStats(responseDetails.responseText);
			});
	},

	parseMercStats: function(responseText) {
		var mercPage=calfSystem.createDocument(responseText);
		var mercElements = mercPage.getElementsByTagName("IMG");
		var totalMercAttack = 0;
		var totalMercDefense = 0;
		var totalMercArmor = 0;
		var totalMercDamage = 0;
		var totalMercHP = 0;
		for (var i=0; i<mercElements.length; i++) {
			merc = mercElements[i];
			var mouseoverText = merc.getAttribute("onmouseover")
			var src = merc.getAttribute("src")
			if (mouseoverText && src.search("/merc/") != -1){
				//<td>Attack:</td><td>1919</td>
				var attackRE=/<td>Attack:<\/td><td>(\d+)<\/td>/;
				var mercAttackValue = attackRE.exec(mouseoverText)[1]*1;
				totalMercAttack += mercAttackValue;
				var defenseRE=/<td>Defense:<\/td><td>(\d+)<\/td>/;
				var mercDefenseValue = defenseRE.exec(mouseoverText)[1]*1;
				totalMercDefense += mercDefenseValue;
				var armorRE=/<td>Armor:<\/td><td>(\d+)<\/td>/;
				var mercArmorValue = armorRE.exec(mouseoverText)[1]*1;
				totalMercArmor += mercArmorValue;
				var damageRE=/<td>Damage:<\/td><td>(\d+)<\/td>/;
				var mercDamageValue = damageRE.exec(mouseoverText)[1]*1;
				totalMercDamage += mercDamageValue;
				var hpRE=/<td>HP:<\/td><td>(\d+)<\/td>/;
				var mercHPValue = hpRE.exec(mouseoverText)[1]*1;
				totalMercHP += mercHPValue;
			}
		}
		var attackValue = calfSystem.findNode("//td[@title='attackValue']");
		attackNumber=attackValue.innerHTML.replace(/,/,"")*1;
		attackValue.innerHTML = Helper.addCommas(attackNumber - Math.round(totalMercAttack*0.2));
		var defenseValue = calfSystem.findNode("//td[@title='defenseValue']");
		defenseNumber=defenseValue.innerHTML.replace(/,/,"")*1;
		defenseValue.innerHTML = Helper.addCommas(defenseNumber - Math.round(totalMercDefense*0.2));
		var armorValue = calfSystem.findNode("//td[@title='armorValue']");
		armorNumber=armorValue.innerHTML.replace(/,/,"")*1;
		armorValue.innerHTML = Helper.addCommas(armorNumber - Math.round(totalMercArmor*0.2));
		var damageValue = calfSystem.findNode("//td[@title='damageValue']");
		damageNumber=damageValue.innerHTML.replace(/,/,"")*1;
		damageValue.innerHTML = Helper.addCommas(damageNumber - Math.round(totalMercDamage*0.2));
		var hpValue = calfSystem.findNode("//td[@title='hpValue']");
		hpNumber=hpValue.innerHTML.replace(/,/,"")*1;
		hpValue.innerHTML = Helper.addCommas(hpNumber - Math.round(totalMercHP*0.2));
	},

	addCommas: function(nStr) {
		nStr += '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : '';
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	},

	injectGroups: function() {
		var mainTable = calfSystem.findNode("//table[@width='650']");
		var subTable = calfSystem.findNode("//table[@width='650']/tbody/tr/td/table");
		var minGroupLevel = GM_getValue("minGroupLevel");
		if (minGroupLevel) {
			var textArea = subTable.rows[0].cells[0];
			textArea.innerHTML += ' <span style="color:blue">Current Min Level Setting: '+ minGroupLevel +'</span>';
		}

		allItems = calfSystem.findNodes("//tr[td/a/img/@title='View Group Stats']");
		var memberList=calfSystem.getValueJSON("memberlist");
		// window.alert(typeof(memberList.members));
		// memberList.lookupByName.find
		for (i=0; i<allItems.length; i++) {
			var theItem=allItems[i].cells[0];
			var foundName=theItem.textContent;
			for (j=0; j<memberList.members.length; j++) {
				var aMember=memberList.members[j];
				// I hate doing two loops, but using a hashtable implementation I found crashed my browser...
				if (aMember.name==foundName) {
					theItem.innerHTML = "<span style='font-size:small; " + ((aMember.status == "Online")?"color:green;":"") + "'>" +
						theItem.innerHTML + "</span> [" + aMember.level + "]";
				}
			}
		}
		var buttonElement = calfSystem.findNode("//td[input[@value='Join All Available Groups']]");
		buttonElement.innerHTML += '&nbsp;<input id="fetchgroupstats" type="button" value="Fetch Group Stats" class="custombutton">';

		document.getElementById('fetchgroupstats').addEventListener('click', Helper.fetchGroupData, true);

	},

	fetchGroupData: function(evt) {
		var calcButton = calfSystem.findNode("//input[@id='fetchgroupstats']");
		calcButton.style.display = "none";
		var allItems = calfSystem.findNodes("//img[@title='View Group Stats']");
		for (var i=0; i<allItems.length; i++) {
			calfSystem.xmlhttp(allItems[i].parentNode.getAttribute("href"), function(responseDetails) {
				Helper.parseGroupData(responseDetails.responseText, this.callback);
			}, allItems[i].parentNode);
		}
	},

	parseGroupData: function(responseText, linkElement) {
		var doc=calfSystem.createDocument(responseText);
		var allItems = doc.getElementsByTagName("TD")
		//<td><font color="#333333">Attack:&nbsp;</font></td>

		for (var i=0;i<allItems.length;i++) {
			var anItem=allItems[i];
			if (anItem.innerHTML == '<font color="#333333">Attack:&nbsp;</font>'){
				var attackLocation = anItem.nextSibling;
				var attackValue = attackLocation.textContent;
			}
			if (anItem.innerHTML == '<font color="#333333">Defense:&nbsp;</font>'){
				var defenseLocation = anItem.nextSibling;
				var defenseValue = defenseLocation.textContent;
			}
			if (anItem.innerHTML == '<font color="#333333">Armor:&nbsp;</font>'){
				var armorLocation = anItem.nextSibling;
				var armorValue = armorLocation.textContent;
			}
			if (anItem.innerHTML == '<font color="#333333">Damage:&nbsp;</font>'){
				var damageLocation = anItem.nextSibling;
				var damageValue = damageLocation.textContent;
			}
			if (anItem.innerHTML == '<font color="#333333">HP:&nbsp;</font>'){
				var hpLocation = anItem.nextSibling;
				var hpValue = hpLocation.textContent;
			}
		}
		extraText = "<table cellpadding='1' style='font-size:x-small; border-top:2px black solid; border-spacing: 1px; border-collapse: collapse;'>"
		extraText += "<tr>";
		extraText += "<td style='color:brown;'>Attack</td><td align='right'>" + attackValue + "</td>";
		extraText += "<td style='color:brown;'>Defense</td><td align='right'>" + defenseValue + "</td></tr>";
		extraText += "<tr>";
		extraText += "<td style='color:brown;'>Armor</td><td align='right'>" + armorValue + "</td>";
		extraText += "<td style='color:brown;'>Damage</td><td align='right'>" + damageValue + "</td></tr>";
		extraText += "<tr>";
		extraText += "<td style='color:brown;'>HP</td><td align='right'>" + hpValue + "</td>";
		extraText += "<td colspan='2'></td></tr>";
		extraText += "</table>";
		expiresLocation = linkElement.parentNode.previousSibling.previousSibling;
		expiresLocation.innerHTML += extraText;
	},

	addMarketplaceWidgets: function() {
		var requestTable = calfSystem.findNode("//table[tbody/tr/td/input[@value='Confirm Request']]");
		var newRow = requestTable.insertRow(2);
		var newCell = newRow.insertCell(0);
		newCell.id = "warningfield";
		newCell.colSpan = "2";
		newCell.align = "center";

		document.getElementById('price').addEventListener('keyup', Helper.addMarketplaceWarning, true);
	},

	addMarketplaceWarning: function(evt) {
		 var goldPerPoint = calfSystem.findNode("//input[@id='price']");
		 var warningField = calfSystem.findNode("//td[@id='warningfield']");
		 var sellPrice = goldPerPoint.value;
		 if (sellPrice.search(/^[0-9]*$/) != -1) {
			var warningColor = "green";
			var warningText = "</b><br>This is probably an offer that will please someone.";
			if (sellPrice < 100000) {
				warningColor = "brown";
				var warningText = "</b><br>This is too low ... it just ain't gonna sell.";
			} else if (sellPrice > 125000) {
				warningColor = "red";
				var warningText = "</b><br>Hold up there ... this is way to high a price ... you should reconsider.";
			}
			warningField.innerHTML = "<span style='color:" + warningColor + ";'>You are offering to buy FSP for >> <b>" +
				Helper.addCommas(sellPrice) + warningText + "</span>";
		}
	},

	injectQuickBuff: function() {
		var playerIDRE = /tid=(\d+)/;
		var playerID = playerIDRE.exec(location);
		if (playerID) {
			var playerID = playerID[1];
			calfSystem.xmlhttp("index.php?cmd=profile&player_id=" + playerID, function(responseDetails) {Helper.getPlayerBuffs(responseDetails.responseText);})
		}
		calfSystem.xmlhttp("index.php?cmd=profile", function(responseDetails) {Helper.getSustain(responseDetails.responseText);})
	},

	getPlayerBuffs: function(responseText) {
		var injectHere = calfSystem.findNode("//input[@value='Activate Selected Skills']/parent::*/parent::*");
		var resultText = "<table align='center'><tr><td colspan='4' style='color:lime;font-weight:bold'>Buffs already on player:</td></tr>";

		//low level buffs used to get the buff above are not really worth casting.
		var myBuffs = calfSystem.findNodes("//font[@size='1']");
		for (var i=0;i<myBuffs.length;i++) {
			var myBuff=myBuffs[i];
			var buffLevelRE = /\[(\d+)\]/
			var buffLevel = buffLevelRE.exec(myBuff.innerHTML)[1]*1;
			if (buffLevel < 75
			    && myBuff.innerHTML.search("Counter Attack") == -1 && myBuff.innerHTML.search("Quest Finder") == -1) {
				myBuff.style.color = "gray";
			}
		}

		//this could be formatted better ... it looks ugly but my quick attempts at putting it in a table didn't work.
		var doc=calfSystem.createDocument(responseText);
		var buffs = calfSystem.findNodes("//img[contains(@onmouseover,'tt_setWidth(105)')]", doc);
		if (buffs) {
			var buffRE, buff, buffName, buffLevel;
			for (var i=0;i<buffs.length;i++) {
				var aBuff=buffs[i];
				var onmouseover = aBuff.getAttribute("onmouseover");
				if (onmouseover.search("Summon Shield Imp") != -1) {
					//tt_setWidth(105); Tip('<center><b>Summon Shield Imp<br>6 HP remaining<br></b> (Level: 150)</b></center>');
					//tt_setWidth(105); Tip('<center><b>Summon Shield Imp<br> HP remaining<br></b> (Level: 165)</b></center>');
					buffRE = /<b>([ a-zA-Z]+)<br>([0-9]+) HP remaining<br><\/b> \(Level: (\d+)\)/
					buff = buffRE.exec(onmouseover);
					if (!buff) {
						buffRE = /<b>([ a-zA-Z]+)<br> HP remaining<br><\/b> \(Level: (\d+)\)/
						buff = buffRE.exec(onmouseover);
					}
					if (!buff) GM_log(onmouseover);
					buffName = buff[1];
					buffLevel = buff[3];
				} else {
					buffRE = /<b>([ a-zA-Z]+)<\/b> \(Level: (\d+)\)/
					buff = buffRE.exec(onmouseover);
					buffName = buff[1];
					buffLevel = buff[2];
				}
				resultText += ((i % 2 == 0)? "<tr>":"");
				resultText += "<td style='color:white; font-size:x-small'>" + buffName + "</td><td style='color:silver; font-size:x-small'>[" + buffLevel + "]</td>";
				resultText += ((i % 2 == 1)? "</tr>":"");
				var hasThisBuff = calfSystem.findNode("//font[contains(.,'" + buffName + "')]");
				if (hasThisBuff) {
					var buffLevelRE = /\[(\d+)\]/
					var buffLevel = parseInt(buffLevelRE.exec(hasThisBuff.innerHTML)[1]);
					if (buffLevel > 11) {
						hasThisBuff.style.color='lime';
					}
				}
			}
			resultText += ((i % 2 == 1)? "<td></td></tr>":"");
		} else {
			resultText += "<tr><td colspan='4' style='text-align:center;color:white; font-size:x-small'>[no buffs]</td></tr>";
		}

		//var playerLevel=Helper.findNodeText("//td[contains(b,'Level:')]/following-sibling::td[1]", doc);
		//var playerXP=Helper.findNodeText("//td[contains(b,'XP:')]/following-sibling::td[1]", doc);
		resultText += "</table>"

		var statistics = calfSystem.findNode("//tr[contains(td/b,'Statistics')]/following-sibling::tr[2]/td/table", doc);
		statistics.style.backgroundImage = 'url(' + calfSystem.imageServer + '/skin/realm_top_b2.jpg)'; //Color='white';

		var lastActivity = calfSystem.findNode("//font[contains(.,'Last Activity:')]", doc);
		if (lastActivity) {
			var newRow = statistics.insertRow(0);
			var newCell = newRow.insertCell(0);
			newCell.setAttribute('colspan', '4');
			newCell.style.textAlign='center';
			newCell.innerHTML=lastActivity.innerHTML + '<br/>';
		}

		resultText += statistics.parentNode.innerHTML;


		// injectHere.innerHTML += "<br/><span style='color:lime;font-weight:bold'>Buffs already on player:</span><br/>"
		injectHere.innerHTML += resultText; // "<br/><span style='color:lime;font-weight:bold'>Buffs already on player:</span><br/>"

	},

	getSustain: function(responseText) {
		var doc=calfSystem.createDocument(responseText);
		var sustainText = calfSystem.findNode("//a[contains(@onmouseover,'<b>Sustain</b>')]", doc);
		if (!sustainText) return;
		var sustainMouseover = sustainText.parentNode.parentNode.parentNode.nextSibling.nextSibling.firstChild.getAttribute("onmouseover");
		var sustainLevelRE = /Level<br>(\d+)%/
		var sustainLevel = sustainLevelRE.exec(sustainMouseover)[1];
		var activateInput = calfSystem.findNode("//input[@value='activate']");
		var inputTable = activateInput.nextSibling.nextSibling;
		inputTable.rows[3].cells[0].align = "center";
		inputTable.rows[3].cells[0].innerHTML += " <span style='color:orange;'>Your Sustain level: " + sustainLevel + "%</span>";
		var furyCasterText = calfSystem.findNode("//a[contains(@onmouseover,'<b>Fury Caster</b>')]", doc);
		if (!furyCasterText) return;
		var furyCasterMouseover = furyCasterText.parentNode.parentNode.parentNode.nextSibling.nextSibling.firstChild.getAttribute("onmouseover");
		var furyCasterLevelRE = /Level<br>(\d+)%/
		var furyCasterLevel = furyCasterLevelRE.exec(furyCasterMouseover)[1];
		inputTable.rows[3].cells[0].innerHTML += " <span style='color:orange;'>Your Fury Caster level: " + furyCasterLevel + "%</span>";
	},

	getKillStreak: function(responseText) {
		var doc=calfSystem.createDocument(responseText);
		//Kill&nbsp;Streak:&nbsp;
		var killStreakText = calfSystem.findNode("//b[contains(.,'Kill')]", doc);
		if (killStreakText) {
			var killStreakLocation = killStreakText.parentNode.nextSibling;
			var playerKillStreakValue = killStreakLocation.textContent.replace(/,/,"")*1;
		}
		var killStreakElement = calfSystem.findNode("//span[@findme='killstreak']");
		killStreakElement.innerHTML = Helper.addCommas(playerKillStreakValue);
		GM_setValue("lastKillStreak", playerKillStreakValue);
		var deathDealerBuff = calfSystem.findNode("//img[contains(@onmouseover,'Death Dealer')]");
		var deathDealerRE = /<b>Death Dealer<\/b> \(Level: (\d+)\)/
		var deathDealer = deathDealerRE.exec(deathDealerBuff.getAttribute("onmouseover"));
		if (deathDealer) {
			var deathDealerLevel = deathDealer[1];
			var deathDealerPercentage = (Math.min(Math.floor(playerKillStreakValue/5) * 0.01 * deathDealerLevel, 20))
		}
		var deathDealerPercentageElement = calfSystem.findNode("//span[@findme='damagebonus']");
		deathDealerPercentageElement.innerHTML = deathDealerPercentage;
		GM_setValue("lastDeathDealerPercentage", deathDealerPercentage);
	},

	injectCreature: function() {
		calfSystem.xmlhttp("index.php?cmd=profile", function(responseDetails) {
				Helper.getCreaturePlayerData(responseDetails.responseText);
			})
	},

	getCreaturePlayerData: function(responseText) {
		//playerdata
		var doc=calfSystem.createDocument(responseText);
		var allItems = doc.getElementsByTagName("B");
		for (var i=0;i<allItems.length;i++) {
			var anItem=allItems[i];
			if (anItem.innerHTML == "Attack:&nbsp;"){
				var attackText = anItem;
				var attackLocation = attackText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerAttackValue = parseInt(attackLocation.textContent);
				var defenseText = attackText.parentNode.nextSibling.nextSibling.nextSibling.firstChild;
				var defenseLocation = defenseText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerDefenseValue = parseInt(defenseLocation.textContent);
				var armorText = defenseText.parentNode.parentNode.nextSibling.nextSibling.firstChild.nextSibling.firstChild;
				var armorLocation = armorText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerArmorValue = parseInt(armorLocation.textContent);
				var damageText = armorText.parentNode.nextSibling.nextSibling.nextSibling.firstChild;
				var damageLocation = damageText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerDamageValue = parseInt(damageLocation.textContent);
				var hpText = damageText.parentNode.parentNode.nextSibling.nextSibling.firstChild.nextSibling.firstChild;
				var hpLocation = hpText.parentNode.nextSibling.firstChild.firstChild.firstChild.firstChild;
				var playerHPValue = parseInt(hpLocation.textContent);
			}
			if (anItem.innerHTML == "Kill&nbsp;Streak:&nbsp;"){
				var killStreakText = anItem;
				var killStreakLocation = killStreakText.parentNode.nextSibling;
				var playerKillStreakValue = killStreakLocation.textContent.replace(/,/,"")*1;
			}
		}
		//get buffs here later ... DD, CA, DC, Constitution, etc
		var allItems = doc.getElementsByTagName("IMG");
		var counterAttackLevel = 0;
		var doublerLevel = 0;
		var deathDealerLevel = 0;
		var darkCurseLevel = 0;
		var holyFlameLevel = 0;
		var constitutionLevel = 0;
		var sanctuaryLevel = 0;
		for (var i=0;i<allItems.length;i++) {
			var anItem=allItems[i];
			if (anItem.getAttribute("src").search("/skills/") != -1) {
				var onmouseover = anItem.getAttribute("onmouseover")
				var counterAttackRE = /<b>Counter Attack<\/b> \(Level: (\d+)\)/
				var counterAttack = counterAttackRE.exec(onmouseover);
				if (counterAttack) {
					counterAttackLevel = counterAttack[1];
				}
				var doublerRE = /<b>Doubler<\/b> \(Level: (\d+)\)/
				var doubler = doublerRE.exec(onmouseover);
				if (doubler) {
					doublerLevel = doubler[1];
				}
				var deathDealerRE = /<b>Death Dealer<\/b> \(Level: (\d+)\)/
				var deathDealer = deathDealerRE.exec(onmouseover);
				if (deathDealer) {
					deathDealerLevel = deathDealer[1];
				}
				var darkCurseRE = /<b>Dark Curse<\/b> \(Level: (\d+)\)/
				var darkCurse = darkCurseRE.exec(onmouseover);
				if (darkCurse) {
					darkCurseLevel = darkCurse[1];
				}
				var holyFlameRE = /<b>Dark Curse<\/b> \(Level: (\d+)\)/
				var holyFlame = holyFlameRE.exec(onmouseover);
				if (holyFlame) {
					holyFlameLevel = holyFlame[1];
				}
				var constitutionRE = /<b>Constitution<\/b> \(Level: (\d+)\)/
				var constitution = constitutionRE.exec(onmouseover);
				if (constitution) {
					constitutionLevel = constitution[1];
				}
				var sanctuaryRE = /<b>Sanctuary<\/b> \(Level: (\d+)\)/
				var sanctuary = sanctuaryRE.exec(onmouseover);
				if (sanctuary) {
					sanctuaryLevel = sanctuary[1];
				}
			}
		}
		//creaturedata
		var creatureStatTable = calfSystem.findNode("//table[tbody/tr/td[.='Statistics']]");
		if (!creatureStatTable) {return;}
		var creatureClass = creatureStatTable.rows[1].cells[1].textContent;
		var creatureLevel = creatureStatTable.rows[1].cells[3].textContent;
		var creatureAttack = creatureStatTable.rows[2].cells[1].textContent.replace(/,/,"")*1;
		var creatureDefense = creatureStatTable.rows[2].cells[3].textContent.replace(/,/,"")*1;
		var creatureArmor = creatureStatTable.rows[3].cells[1].textContent.replace(/,/,"")*1;
		var creatureDamage = creatureStatTable.rows[3].cells[3].textContent.replace(/,/,"")*1;
		var creatureHP = creatureStatTable.rows[4].cells[1].textContent.replace(/,/,"")*1;
		//math section ... analysis
		//Holy Flame adds its bonus after the armor of the creature has been taken off.
		var extraNotes = "";
		if (creatureClass == "Undead") {
			playerDamageValue = playerDamageValue + ((playerDamageValue - creatureArmor) * holyFlameLevel * 0.002);
			var holyFlameBonusDamage = Math.floor((playerDamageValue - creatureArmor) * holyFlameLevel * 0.002);
			extraNotes += (holyFlameLevel > 0? "HF Bonus Damage = " + holyFlameBonusDamage + "<br>":"");
		}
		//Death Dealer and Counter Attack both applied at the same time
		var deathDealerBonusDamage = Math.floor(playerDamageValue * (Math.min(Math.floor(playerKillStreakValue/5) * 0.01 * deathDealerLevel, 20)/100));
		var counterAttackBonusAttack = Math.ceil(playerAttackValue * 0.0025 * counterAttackLevel);
		var counterAttackBonusDamage = Math.ceil(playerDamageValue * 0.0025 * counterAttackLevel);
		var extraStaminaPerHit = (counterAttackLevel > 0? Math.ceil((1+(500/50))*0.0025*counterAttackLevel) :0);
		playerAttackValue += counterAttackBonusAttack;
		playerDamageValue += deathDealerBonusDamage + counterAttackBonusDamage;
		extraNotes += (deathDealerLevel > 0? "DD Bonus Damage = " + deathDealerBonusDamage + "<br>":"");
		if (counterAttackLevel > 0) {
			extraNotes += "CA Bonus Attack = " + counterAttackBonusAttack + "<br>";
			extraNotes += "CA Bonus Damage = " + counterAttackBonusDamage + "<br>";
			extraNotes += "CA Extra Stam Used = " + extraStaminaPerHit + "<br>";
		}
		//Attack:
		extraNotes += (darkCurseLevel > 0? "DC Bonus Attack = " + Math.floor(creatureDefense * darkCurseLevel * 0.002) + "<br>":"");
		var hitByHowMuch = (playerAttackValue - Math.ceil(1.1053*(creatureDefense - (creatureDefense * darkCurseLevel * 0.002))));
		//Damage:
		var damageDone = Math.floor(playerDamageValue - ((1.1053*creatureArmor) + (1.053*creatureHP)));
		var numberOfHitsRequired = (hitByHowMuch > 0? Math.ceil((1.053*creatureHP)/((playerDamageValue < (1.1053*creatureArmor))? 1: playerDamageValue - (1.1053*creatureArmor))):"-");
		//Defense:
		extraNotes += (constitutionLevel > 0? "Constitution Bonus Defense = " + Math.floor(playerDefenseValue * constitutionLevel * 0.001) + "<br>":"");
		var creatureHitByHowMuch = Math.floor((1.1053*creatureAttack) - (playerDefenseValue + (playerDefenseValue * constitutionLevel * 0.001)));
		//Armor and HP:
		extraNotes += (sanctuaryLevel > 0? "Sanc Bonus Armor = " + Math.floor(playerArmorValue * sanctuaryLevel * 0.001) + "<br>":"");
		var creatureDamageDone = Math.ceil((1.1053*creatureDamage) - (playerArmorValue + (playerArmorValue * sanctuaryLevel * 0.001) + playerHPValue));
		var numberOfCreatureHitsTillDead = (creatureHitByHowMuch >= 0? Math.ceil(playerHPValue/(((1.1053*creatureDamage) < (playerArmorValue + (playerArmorValue * sanctuaryLevel * 0.001)))? 1: (1.1053*creatureDamage) - (playerArmorValue + (playerArmorValue * sanctuaryLevel * 0.001)))):"-");
		//Analysis:
		var playerHits = (numberOfCreatureHitsTillDead=="-"? numberOfHitsRequired:(numberOfHitsRequired=="-"?"-":(numberOfHitsRequired>numberOfCreatureHitsTillDead?"-":numberOfHitsRequired)));
		var creatureHits = (numberOfHitsRequired=="-"?numberOfCreatureHitsTillDead:(numberOfCreatureHitsTillDead=="-"?"-":(numberOfCreatureHitsTillDead>numberOfHitsRequired?"-":numberOfCreatureHitsTillDead)));
		var fightStatus = "Unknown";
		if (playerHits == "-" && creatureHits == "-") {
			fightStatus = "Unresolved";
		} else if (playerHits == "-") {
			fightStatus = "Player dies";
		} else if (playerHits == 1) {
			fightStatus = "Player 1 hits" + (numberOfCreatureHitsTillDead-numberOfHitsRequired<=1? ", dies on miss":", survives a miss");
		} else if (playerHits > 1) {
			fightStatus = "Player > 1 hits" + (numberOfCreatureHitsTillDead-numberOfHitsRequired<=1? ", dies on miss":", survives a miss");
		}
		//display data
		var newRow = creatureStatTable.insertRow(creatureStatTable.rows.length);
		var newCell = newRow.insertCell(0);
		newCell.colSpan = '4';
		newCell.innerHTML = "<table width='100%'><tbody><tr><td bgcolor='#CD9E4B' colspan='4' align='center'>Combat Evaluation</td></tr>" +
			"<tr><td align='right'><span style='color:#333333'>Will I hit it? </td><td align='left'>" + (hitByHowMuch > 0? "Yes":"No") + "</td>" +
				"<td align='right'><span style='color:#333333'>Extra Attack: </td><td align='left'>( " + hitByHowMuch + " )</td></tr>" +
			"<tr><td align='right'><span style='color:#333333'># Hits to kill it? </td><td align='left'>" + numberOfHitsRequired + "</td>" +
				"<td align='right'><span style='color:#333333'>Extra Damage: </td><td align='left'>( " + damageDone + " )</td></tr>" +
			"<tr><td align='right'><span style='color:#333333'>Will I be hit? </td><td align='left'>" + (creatureHitByHowMuch >= 0? "Yes":"No") + "</td>" +
				"<td align='right'><span style='color:#333333'>Extra Defense: </td><td align='left'>( " + creatureHitByHowMuch + " )</td></tr>" +
			"<tr><td align='right'><span style='color:#333333'># Hits to kill me? </td><td align='left'>" + numberOfCreatureHitsTillDead + "</td>" +
				"<td align='right'><span style='color:#333333'>Extra Armor + HP: </td><td align='left'>( " + creatureDamageDone + " )</td></tr>" +
			"<tr><td align='right'><span style='color:#333333'># Player Hits? </td><td align='left'>" + playerHits + "</td>" +
				"<td align='right'><span style='color:#333333'># Creature Hits? </td><td align='left'>" + creatureHits + "</td></tr>" +
			"<tr><td align='right'><span style='color:#333333'>Fight Status: </span></td><td align='left' colspan='3'><span>" + fightStatus + "</span></td></tr>" +
			"<tr><td align='right'><span style='color:#333333'>Notes: </span></td><td align='left' colspan='3'><span style='font-size:x-small;'>" +
				extraNotes + "</span></td></tr>" +
			"<tr><td colspan='4'><span style='font-size:x-small; color:gray'>" +
				"*Does include CA, DD, HF, DC, Sanctuary and Constitution (if active) and allow for randomness (1.1053).</span></td></tr>" +
			"</tbody></table>";
	},

	addBioWidgets: function() {
		var textArea = calfSystem.findNode("//textarea[@name='bio']");
		//textArea.rows=15;
		textArea.cols=60;
		textArea.id = "biotext";
		var textAreaTable = textArea.parentNode.parentNode.parentNode.parentNode;
		var bioPreviewHTML = Helper.convertBioToHTML(textArea.value);
		var newRow = textAreaTable.insertRow(-1);
		var newCell = newRow.insertCell(0);
		newCell.innerHTML = '<table align="center" width="325" border="1"><tbody>' +
			'<tr><td style="text-align:center;color:#7D2252;background-color:#CD9E4B">Preview</td></tr>' +
			'<tr><td width="325"><span style="font-size:small;" findme="biopreview">' + bioPreviewHTML +
			'</span></td></tr></tbody></table>';
		var innerTable = calfSystem.findNode("//table[tbody/tr/td/font/b[.='Update your Character Biography']]");
		var crCount = 0;
		var startIndex = 0;
		while (textArea.value.indexOf('\n',startIndex+1) != -1) {
			crCount++;
			startIndex = textArea.value.indexOf('\n',startIndex+1);
		}
		innerTable.rows[4].cells[0].innerHTML += "<span style='color:blue;'>Character count = </span><span findme='biolength' style='color:blue;'>" +
			(textArea.value.length + crCount) + "</span><span style='color:blue;'>/</span><span findme='biototal' style='color:blue;'>255</span>";

		document.getElementById('biotext').addEventListener('keyup', Helper.updateBioCharacters, true);
		calfSystem.xmlhttp("index.php?cmd=points", function(responseDetails) {
				Helper.getTotalBioCharacters(responseDetails.responseText);
			})
	},

	updateBioCharacters: function(evt) {
		var textArea = calfSystem.findNode("//textarea[@name='bio']");
		var characterCount = calfSystem.findNode("//span[@findme='biolength']");
		var crCount = 0;
		var startIndex = 0;
		while (textArea.value.indexOf('\n',startIndex+1) != -1) {
			crCount++;
			startIndex = textArea.value.indexOf('\n',startIndex+1);
		}
		characterCount.innerHTML = (textArea.value.length + crCount);
		var bioTotal = calfSystem.findNode("//span[@findme='biototal']");
		if ((characterCount.innerHTML*1) > (bioTotal.innerHTML*1)) {
			characterCount.style.color = "red";
		} else {
			characterCount.style.color = "blue";
		}
		var previewArea = calfSystem.findNode("//span[@findme='biopreview']");
		var bioPreviewHTML = Helper.convertBioToHTML(textArea.value);
		previewArea.innerHTML = bioPreviewHTML;
	},

	getTotalBioCharacters: function(responseText) {
		var doc=calfSystem.createDocument(responseText)
		var bioCharactersText = calfSystem.findNode("//td[.='+25 Bio Characters']",doc);
		var bioCharactersRatio = bioCharactersText.nextSibling.nextSibling.nextSibling.nextSibling;
		var bioCharactersValueRE = /(\d+) \/ 75/;
		var bioCharactersValue = bioCharactersValueRE.exec(bioCharactersRatio.innerHTML)[1]*1;
		var bioTotal = calfSystem.findNode("//span[@findme='biototal']");
		bioTotal.innerHTML = (bioCharactersValue * 25) + 255;
	},

	convertBioToHTML: function(inputText) {
		var outputHTML = inputText;
		outputHTML = outputHTML.replace(/</g,"&lt");
		outputHTML = outputHTML.replace(/>/g,"&gt");
		outputHTML = outputHTML.replace(/\n/g,"<br>");
		outputHTML = outputHTML.replace(/\[\/([a-z])]/g,"<\/\$1>");
		outputHTML = outputHTML.replace(/\[([a-z])\]/g,"<\$1>");
		return outputHTML
	},

	addHistoryWidgets: function() {
		var textArea = calfSystem.findNode("//textarea[@name='history']");
		if (!textArea) return;
		var textAreaTable = textArea.parentNode.parentNode.parentNode.parentNode;
		var bioPreviewHTML = Helper.convertBioToHTML(textArea.value);
		var newRow = textAreaTable.insertRow(-1);
		var newCell = newRow.insertCell(0);
		newCell.innerHTML = '<table align="center" width="325" border="1"><tbody>' +
			'<tr><td style="text-align:center;color:#7D2252;background-color:#CD9E4B">Preview</td></tr>' +
			'<tr><td width="325"><span style="font-size:small;" findme="biopreview">' + bioPreviewHTML +
			'</span></td></tr></tbody></table>';
		textArea.id = "historytext";
		var innerTable = calfSystem.findNode("//table[tbody/tr/td/font/b[.='Edit Guild History']]");
		var crCount = 0;
		var startIndex = 0;
		while (textArea.value.indexOf('\n',startIndex+1) != -1) {
			crCount++;
			startIndex = textArea.value.indexOf('\n',startIndex+1);
		}
		innerTable.rows[4].cells[0].innerHTML += "<span style='color:blue;'>Character count = </span><span findme='historylength' style='color:blue;'>" +
			(textArea.value.length + crCount) + "</span><span style='color:blue;'>/</span><span findme='historytotal' style='color:blue;'>255</span>";

		document.getElementById('historytext').addEventListener('keyup', Helper.updateHistoryCharacters, true);
		calfSystem.xmlhttp("index.php?cmd=points&subcmd=guildupgrades", function(responseDetails) {
				Helper.getTotalHistoryCharacters(responseDetails.responseText);
			});
	},

	updateHistoryCharacters: function(evt) {
		var textArea = calfSystem.findNode("//textarea[@name='history']");
		var characterCount = calfSystem.findNode("//span[@findme='historylength']");
		var crCount = 0;
		var startIndex = 0;
		while (textArea.value.indexOf('\n',startIndex+1) != -1) {
			crCount++;
			startIndex = textArea.value.indexOf('\n',startIndex+1);
		}
		characterCount.innerHTML = (textArea.value.length + crCount);
		var bioTotal = calfSystem.findNode("//span[@findme='historytotal']");
		if ((characterCount.innerHTML*1) > (bioTotal.innerHTML*1)) {
			characterCount.style.color = "red";
		} else {
			characterCount.style.color = "blue";
		}
		var previewArea = calfSystem.findNode("//span[@findme='biopreview']");
		var bioPreviewHTML = Helper.convertBioToHTML(textArea.value);
		previewArea.innerHTML = bioPreviewHTML;
	},

	getTotalHistoryCharacters: function(responseText) {
		var doc=calfSystem.createDocument(responseText)
		var historyCharactersText = calfSystem.findNode("//td[.='+20 History Characters']",doc);
		var historyCharactersRatio = historyCharactersText.nextSibling.nextSibling.nextSibling.nextSibling;
		var historyCharactersValueRE = /(\d+) \/ 250/;
		var historyCharactersValue = historyCharactersValueRE.exec(historyCharactersRatio.innerHTML)[1]*1;
		var historyTotal = calfSystem.findNode("//span[@findme='historytotal']");
		historyTotal.innerHTML = (historyCharactersValue * 20) + 255;
	},

	portalToKrul: function(evt) {
		var answer = window.confirm('Are you sure you with to use a special portal back to Krul Island?');
		if (answer) {
			var krulXCV = GM_getValue("krulXCV");
			if (krulXCV) {
				calfSystem.xmlhttp("index.php?cmd=settings&subcmd=fix&xcv=" + krulXCV, function(responseDetails) {
						window.location="index.php?cmd=world";
					})
			} else {
				alert("Please visit the preferences page to cache your Krul Portal link");
			}
		}
	},

	storePlayerUpgrades: function() {
		var alliesText = calfSystem.findNode("//td[.='+1 Max Allies']");
		var alliesRatio = alliesText.nextSibling.nextSibling.nextSibling.nextSibling;
		var alliesValueRE = /(\d+) \/ 115/;
		var alliesValue = alliesValueRE.exec(alliesRatio.innerHTML)[1]*1;
		GM_setValue("alliestotal",alliesValue+5);
		var enemiesText = calfSystem.findNode("//td[.='+1 Max Enemies']");
		var enemiesRatio = enemiesText.nextSibling.nextSibling.nextSibling.nextSibling;
		var enemiesValueRE = /(\d+) \/ 115/;
		var enemiesValue = enemiesValueRE.exec(enemiesRatio.innerHTML)[1]*1;
		GM_setValue("enemiestotal",enemiesValue+5);
	},

	injectTopRated: function() {
		var mainTable = calfSystem.findNode("//table[tbody/tr/td/font/b[.='Top 250 Players']]");
		var mainTitle = mainTable.rows[0].cells[0];
		mainTitle.innerHTML += '&nbsp<input id="findOnlinePlayers" type="button" value="Find Online Players" ' +
			'title="Fetch the online status of the top 250 players (warning ... takes a few seconds)." class="custombutton">';

		document.getElementById('findOnlinePlayers').addEventListener('click', Helper.findOnlinePlayers, true);
	},

	findOnlinePlayers: function() {
		var findPlayersButton = calfSystem.findNode("//input[@id='findOnlinePlayers']");
		findPlayersButton.style.display = "none";
		var topPlayerTable = calfSystem.findNode("//table[@width='500']");
		var lowestLevel = topPlayerTable.rows[topPlayerTable.rows.length-4].cells[3].textContent*1;
		GM_setValue("lowestLevelInTop250",lowestLevel);
		var guildsChecked = "";
		for (var i=0; i<topPlayerTable.rows.length; i++) {
			var aRow = topPlayerTable.rows[i];
			if (aRow.cells[1] && i!=0) {
				var playerTable = topPlayerTable.rows[i].cells[1].firstChild;
				var playerElement = playerTable.rows[0].cells[0];
				var playerGuildHref = playerElement.firstChild.getAttribute("href");
				var playerGuildName = playerElement.firstChild.firstChild.getAttribute("title");
				//GM_log(guildsChecked.indexOf(playerGuildName));
				//if we haven't already checked this guild, then go ahead and check it
				if (guildsChecked.search(playerGuildName) == -1) {
					//GM_log(i+"::"+playerGuildName + "::" + playerGuildHref + "::" + aRow.innerHTML + "::" + guildsChecked);
					calfSystem.xmlhttp(playerGuildHref, function(responseDetails) {
							Helper.parseGuildOnline(responseDetails.responseText);
						});
					//log current guild as checked.
					guildsChecked += ' ' + playerGuildName;
				}
			}
		}
	},

	parseGuildOnline: function(responseText) {
		var topPlayerTable = calfSystem.findNode("//table[@width='500']");
		var lowestLevel = GM_getValue("lowestLevelInTop250");
		var doc=calfSystem.createDocument(responseText);
		memberTable = calfSystem.findNode("//table[tbody/tr/td[.='Rank']]", doc);
		for (var i=0; i<memberTable.rows.length; i++) {
			aRow = memberTable.rows[i];
			if (aRow.cells[1] && i!= 0) {
				onlineStatus = aRow.cells[0].innerHTML;
				playerName = aRow.cells[1].firstChild.nextSibling.innerHTML;
				playerLevel = aRow.cells[2].textContent*1;
				if (playerLevel >= lowestLevel) { // don't bother looking if they are a low level
					//var playerInTopPlayerList = calfSystem.findNode("//a[.='" + playerName +"']", topPlayerTable); // didn't work so had to comprimise.
					var playerInTopPlayerList = calfSystem.findNode("//a[.='" + playerName +"']");
					var inTopPlayerTable = calfSystem.findNode("//table[@width='500' and contains(.,'" + playerName +"')]");
					if (playerInTopPlayerList && inTopPlayerTable) {
						insertHere = playerInTopPlayerList.parentNode;
						insertHere.innerHTML += '&nbsp' + onlineStatus;
					}
				}
			}
		}
	},

	toggleVisibilty: function(evt) {
		var anItemId=evt.target.getAttribute("linkto")
		var anItem=document.getElementById(anItemId);
		var currentVisibility=anItem.style.visibility;
		anItem.style.visibility=(currentVisibility=="hidden")?"visible":"hidden";
		anItem.style.display=(currentVisibility=="hidden")?"block":"none";
		if (GM_getValue(anItemId)) {
			GM_setValue(anItemId, "");
		} else{
			GM_setValue(anItemId, "ON");
		}
	},

	injectSettingsGuildData: function(guildType) {
		var result='';
		result += '<input name="guild' + guildType + '" size="60" value="' + GM_getValue("guild" + guildType) + '">'
		result += '<span style="cursor:pointer;text-decoration:none;" id="toggleShowGuild' + guildType + 'Message" linkto="showGuild' +
			guildType + 'Message"> &#x00bb;</span>'
		result += '<div id="showGuild' + guildType + 'Message" style="visibility:hidden;display:none">'
		result += '<input name="guild' + guildType + 'Message" size="60" value="' + GM_getValue("guild" + guildType + "Message") + '">'
		result += '</div>'
		return result;
	},

	formatDateTime: function(aDate) {
		var result=aDate.toDateString()
		result += " "
		var hh=aDate.getHours();
		if (hh<10) hh = "0" + hh;
		var mm=aDate.getMinutes();
		if (mm<10) mm = "0" + mm
		result += hh + ":" + mm
		return result
	},

	injectSettings: function() {
		var lastCheck=new Date(parseInt(GM_getValue("lastVersionCheck")));
		var buffs=GM_getValue("huntingBuffs");

		var configData=
			'<form><table width="100%" cellspacing="0" cellpadding="5" border="0">' +
			'<tr><td colspan="4" height="1" bgcolor="#333333"></td></tr>' +
			'<tr><td colspan="4"><b>Fallen Sword Helper configuration</b></td></tr>' +
			'<tr><td colspan="4" align=center><input type="button" class="custombutton" value="Check for updates" id="Helper:CheckUpdate"></td></tr>'+
			'<tr><td colspan="4" align=center><span style="font-size:xx-small">(Current version: ' + GM_getValue("currentVersion") + ', Last check: ' + Helper.formatDateTime(lastCheck) +
			')</span></td></tr>' +
			'<tr><td colspan="4" align="left"><b>Enter guild names, seperated by commas</td></tr>' +
			'<tr><td>Own Guild</td><td colspan="3">'+ Helper.injectSettingsGuildData("Self") + '</td></tr>' +
			'<tr><td>Friendly Guilds</td><td colspan="3">'+ Helper.injectSettingsGuildData("Frnd") + '</td></tr>' +
			'<tr><td>Old Guilds</td><td colspan="3">'+ Helper.injectSettingsGuildData("Past") + '</td></tr>' +
			'<tr><td>Enemy Guilds</td><td colspan="3">'+ Helper.injectSettingsGuildData("Enmy") + '</td></tr>' +
			'<tr><th colspan="4" align="left">Other preferences</th></tr>' +
			'<tr><td align="right">Quick Kill Style' + Helper.helpLink('Quick Kill Style', 'Unchecking the checkbox will prevent this option from displaying on the world screen.<br/>'+
				'<b><u>single</u></b> will fast kill a single monster<br>' +
				'<u><b>type</b></u> will fast kill a type of monster<br><u><b>off</b></u> returns control to game normal.') +
				':</td><td><table><tbody>' +
				'<tr>' +
				'<td><input name="showQuickKillOnWorld" type="checkbox" value="on"' + (GM_getValue("showQuickKillOnWorld")?" checked":"") + '></td>' +
				'<td><input type="radio" name="killAllAdvanced" value="off"' + ((GM_getValue("killAllAdvanced") == "off")?" checked":"") + '>off</td>' +
				'<td><input type="radio" name="killAllAdvanced"  value="single"' + ((GM_getValue("killAllAdvanced") == "single")?" checked":"") + '>single</td>'+
				'<td><input type="radio" name="killAllAdvanced"  value="type"' + ((GM_getValue("killAllAdvanced") == "type")?" checked":"") + '>type</td>' +
				'</tbody></table></td>' +
			'<td align="right">Hide Top Banner' + Helper.helpLink('Hide Top Banner', 'Pretty simple ... it just hides the top banner') +
				':</td><td><input name="hideBanner" type="checkbox" value="on"' + (GM_getValue("hideBanner")?" checked":"") + '></td></tr>' +
			'<tr><td align="right">Move FS box' + Helper.helpLink('Move SS2 Box', 'This will move the SS2 box to the left, under the menu, for better visibility (unless it is already hidden.') +
				':</td><td><input name="moveFSBox" type="checkbox" value="on"' + (GM_getValue("moveFSBox")?" checked":"") + '></td>' +
			'<td align="right">Hide \"New?\" box' + Helper.helpLink('Hide New? Box', 'This will hide the New? box, useful to gain some space if you have already read it.') +
				':</td><td><input name="hideNewBox" type="checkbox" value="on"' + (GM_getValue("hideNewBox")?" checked":"") + '></td></tr>' +
			'<tr><td align="right">Keep Combat Logs' + Helper.helpLink('Keep Combat Logs', 'Save combat logs to a temporary variable. '+
				'Press <u>Show logs</u> on the right to display and copy them') +
				':</td><td><input name="keepLogs" type="checkbox" value="on"' + (GM_getValue("keepLogs")?" checked":"") + '></td>' +
			'<td align="right" colspan="2"><input type="button" class="custombutton" value="Show Logs" id="Helper:ShowLogs"></td></td></tr>' +
			'<tr><td align="right">Show Administrative Options' + Helper.helpLink('Show Admininstrative Options', 'Show ranking controls for guild managemenet in member profile page - ' +
				'this works for guild founders only') +
				':</td><td><input name="showAdmin" type="checkbox" value="on"' + (GM_getValue("showAdmin")?" checked":"") + '></td>' +
			'<td align="right">Dim Non Player<br/>Guild Log Messages' + Helper.helpLink('Dim Non Player Guild Log Messages', 'Any log messages not related to the ' +
				'current player will be dimmed (e.g. recall messages from guild store)') +
				':</td><td><input name="hideNonPlayerGuildLogMessages" type="checkbox" value="on"' + (GM_getValue("hideNonPlayerGuildLogMessages")?" checked":"") + '></td></td></tr>' +
			'<tr><td align="right">Disable Item Coloring' + Helper.helpLink('Disable Item Coloring', 'Disable the code that colors the item text based on the rarity of the item.') +
				':</td><td><input name="disableItemColoring" type="checkbox" value="on"' + (GM_getValue("disableItemColoring")?" checked":"") + '></td>' +
			'<td align="right">Enable Log Coloring' + Helper.helpLink('Enable Log Coloring', 'Three logs will be colored if this is enabled, Guild Chat, Guild Log and Player Log. ' +
				'It will show any new messages in yellow and anything 20 minutes old ones in brown.') +
				':</td><td><input name="enableLogColoring" type="checkbox" value="on"' + (GM_getValue("enableLogColoring")?" checked":"") + '></td></td></tr>' +
			'<tr><td align="right">Show Completed Quests' + Helper.helpLink('Show Completed Quests', 'This will show completed quests that have been hidden and will also show any ' +
				'quests you might have missed.') +
				':</td><td><input name="showCompletedQuests" type="checkbox" value="on"' + (GM_getValue("showCompletedQuests")?" checked":"") + '></td>' +
			'<td align="right">Show chat lines' + Helper.helpLink('Chat lines', 'Display the last {n} lines from guild chat (set to 0 to disable).' +
				((calfSystem.browserVersion<3)?'<br/>Does not work in Firefox 2 - suggest setting to 0 or upgrading to Firefox 3.':'')) +
				':</td><td><input name="chatLines" size="3" value="' + GM_getValue("chatLines") + '"></td></tr>' +
			'<tr><td align="right">Show Combat Log' + Helper.helpLink('Show Combat Log', 'This will show the combat log for each automatic battle below the monster list.') +
				':</td><td><input name="showCombatLog" type="checkbox" value="on"' + (GM_getValue("showCombatLog")?" checked":"") + '></td>' +
			'<td align="right">Show Creature Info' + Helper.helpLink('Show Creature Info', 'This will show the information from the view creature link when you mouseover the link.' +
				((calfSystem.browserVersion<3)?'<br>Does not work in Firefox 2 - suggest disabling or upgrading to Firefox 3.':'')) +
				':</td><td><input name="showCreatureInfo" type="checkbox" value="on"' + (GM_getValue("showCreatureInfo")?" checked":"") + '></td></tr>' +
			'<tr><td align="right">Disable Guild Online List' + Helper.helpLink('Disable Guild Online List', 'This will disable the guild online list.') +
				':</td><td><input name="disableGuildOnlineList" type="checkbox" value="on"' + (GM_getValue("disableGuildOnlineList")?" checked":"") + '></td>' +
			'<td align="right">Show Debug Info' + Helper.helpLink('Show Debug Info', 'This will show debug messages in the Error Console. This is only meant for use by developers.') +
				':</td><td><input name="showDebugInfo" type="checkbox" value="on"' + (GM_getValue("showDebugInfo")?" checked":"") + '></td></tr>' +
			'<tr><td align="right">Hide Krul Portal' + Helper.helpLink('Hide Krul Portal', 'This will hide the Krul portal on the world screen.') +
				':</td><td><input name="hideKrulPortal" type="checkbox" value="on"' + (GM_getValue("hideKrulPortal")?" checked":"") + '></td>' +
			'<td align="right"></td><td></td></tr>' +
			'<tr><td align="right">Hunting Buffs' + Helper.helpLink('Hunting Buffs', 'Customize which buffs are designated as hunting buffs. You must type the full name of each buff, ' +
				'separated by commas. Use the checkbox to enable/disable them.') +
				':</td><td colspan="3"><input name="showHuntingBuffs" type="checkbox" value="on"' + (GM_getValue("showHuntingBuffs")?" checked":"") + '>' +
				'<input name="huntingBuffs" size="60" value="'+ buffs + '" /></td></tr>' +
			'<tr><td align="right">Hide Specific Quests' + Helper.helpLink('Hide Specific Quests', 'If enabled, this hides quests whose name matches the list (separated by commas). ' +
				'This works on Quest Manager and Quest Book.') +
				':</td><td colspan="3"><input name="hideQuests" type="checkbox" value="on"' + (GM_getValue("hideQuests")?" checked":"") + '>' +
				'<input name="hideQuestNames" size="60" value="'+ GM_getValue("hideQuestNames") + '" /></td></tr>' +
			'<tr><td align="right">Hide Specific Recipes' + Helper.helpLink('Hide Specific Recipes', 'If enabled, this hides recipes whose name matches the list (separated by commas). ' +
				'This works on Recipe Manager') +
				':</td><td colspan="3"><input name="hideRecipes" type="checkbox" value="on"' + (GM_getValue("hideRecipes")?" checked":"") + '>' +
				'<input name="hideRecipeNames" size="60" value="'+ GM_getValue("hideRecipeNames") + '" /></td></tr>' +
			//save button
			'<tr><td colspan="4" align=center><input type="button" class="custombutton" value="Save" id="Helper:SaveOptions"></td></tr>' +
			'<tr><td colspan="4" align=center>' +
			'<span style="font-size:xx-small">Fallen Sword Helper was coded by <a href="' + calfSystem.server + 'index.php?cmd=profile&player_id=1393340">Coccinella</a> and ' +
			'<a href="' + calfSystem.server + 'index.php?cmd=profile&player_id=1346893">Tangtop</a>, '+
			'with valuable contributions by <a href="' + calfSystem.server + 'index.php?cmd=profile&player_id=524660">Nabalac</a>, ' +
			'<a href="' + calfSystem.server + 'index.php?cmd=profile&player_id=1570854">jesiegel</a>, ' +
			'<a href="' + calfSystem.server + 'index.php?cmd=profile&player_id=37905">Ananasii</a></td></tr>' +
			'<tr><td colspan="4" align=center>' +
			'<span style="font-size:xx-small">Visit the <a href="http://code.google.com/p/fallenswordhelper/">Fallen Sword Helper web site</a> ' +
			'for any suggestions or bug reports<span></td></tr>' +
			'</table></form>';
		var insertHere = calfSystem.findNode("//table[@width='500']");
		var newRow=insertHere.insertRow(insertHere.rows.length);
		var newCell=newRow.insertCell(0);
		newCell.colSpan=3;
		newCell.innerHTML=configData;
		// insertHere.insertBefore(configData, insertHere);
		document.getElementById('Helper:SaveOptions').addEventListener('click', Helper.saveConfig, true);
		document.getElementById('Helper:CheckUpdate').addEventListener('click', Helper.checkForUpdate, true);
		document.getElementById('Helper:ShowLogs').addEventListener('click', Helper.showLogs, true);

		document.getElementById('toggleShowGuildSelfMessage').addEventListener('click', Helper.toggleVisibilty, true);
		document.getElementById('toggleShowGuildFrndMessage').addEventListener('click', Helper.toggleVisibilty, true);
		document.getElementById('toggleShowGuildPastMessage').addEventListener('click', Helper.toggleVisibilty, true);
		document.getElementById('toggleShowGuildEnmyMessage').addEventListener('click', Helper.toggleVisibilty, true);

		var krulButton = calfSystem.findNode('//input[@value="Instant Teleport back to Taulin Rad Lands"]');
		onClick = krulButton.getAttribute("onclick");
		//window.location='index.php?cmd=settings&subcmd=fix&xcv=3264968baaf287c67b0fab314280b163';
		krulXCVRE = /xcv=([a-z0-9]+)'/
		krulXCV = krulXCVRE.exec(onClick);
		if (krulXCV) GM_setValue("krulXCV",krulXCV[1]);

		var minGroupLevelTextField = calfSystem.findNode('//input[@name="min_group_level"]');
		if (minGroupLevelTextField) {
			var minGroupLevel = minGroupLevelTextField.value;
			GM_setValue("minGroupLevel",minGroupLevel);
		}
	},

	helpLink: function(title, text) {
		return ' [ ' +
			'<span style="text-decoration:underline;cursor:pointer;" onmouseover="Tip(\'' +
			'<span style=\\\'font-weight:bold; color:#FFF380;\\\'>' + title + '</span><br /><br />' +
			text + '\');">?</span>' +
			' ]'
	},

	saveConfig: function(evt) {
		var oForm=evt.target.form;
		calfSystem.saveValueForm(oForm, "guildSelf");
		calfSystem.saveValueForm(oForm, "guildFrnd");
		calfSystem.saveValueForm(oForm, "guildPast");
		calfSystem.saveValueForm(oForm, "guildEnmy");
		calfSystem.saveValueForm(oForm, "guildSelfMessage");
		calfSystem.saveValueForm(oForm, "guildFrndMessage");
		calfSystem.saveValueForm(oForm, "guildPastMessage");
		calfSystem.saveValueForm(oForm, "guildEnmyMessage");
		calfSystem.saveValueForm(oForm, "chatLines");
		calfSystem.saveValueForm(oForm, "showAdmin");
		calfSystem.saveValueForm(oForm, "disableItemColoring");
		calfSystem.saveValueForm(oForm, "enableLogColoring");
		calfSystem.saveValueForm(oForm, "showCompletedQuests");
		calfSystem.saveValueForm(oForm, "hideNonPlayerGuildLogMessages");
		calfSystem.saveValueForm(oForm, "hideBanner");
		calfSystem.saveValueForm(oForm, "showCombatLog");
		calfSystem.saveValueForm(oForm, "showCreatureInfo");
		calfSystem.saveValueForm(oForm, "keepLogs");
		calfSystem.saveValueForm(oForm, "disableGuildOnlineList");
		calfSystem.saveValueForm(oForm, "showDebugInfo");
		calfSystem.saveValueForm(oForm, "killAllAdvanced");
		calfSystem.saveValueForm(oForm, "huntingBuffs");
		calfSystem.saveValueForm(oForm, "showHuntingBuffs");
		calfSystem.saveValueForm(oForm, "moveFSBox");
		calfSystem.saveValueForm(oForm, "hideNewBox");
		calfSystem.saveValueForm(oForm, "showQuickKillOnWorld");
		calfSystem.saveValueForm(oForm, "hideKrulPortal");
		calfSystem.saveValueForm(oForm, "hideQuests");
		calfSystem.saveValueForm(oForm, "hideQuestNames");
		calfSystem.saveValueForm(oForm, "hideRecipes");
		calfSystem.saveValueForm(oForm, "hideRecipeNames");

		window.alert("FS Helper Settings Saved");
		return false;
	},

	showLogs: function(evt) {
		document.location=calfSystem.server + "index.php?cmd=notepad&subcmd=showlogs"
	},

	injectNotepadShowLogs: function() {
		var content=calfSystem.findNode("//table[@width='100%']/..");
		var combatLog=GM_getValue("CombatLog");
		content.innerHTML='<div align="center"><textarea align="center" cols="80" rows="25" '+
			'readonly style="background-color:white;font-family:Consolas,\"Lucida Console\",\"Courier New\",monospace;" id="Helper:CombatLog">' + combatLog + '</textarea></div>' +
			'<br /><br /><table width="100%"><tr>'+
			'<td colspan="2" align=center>' +
			'<input type="button" class="custombutton" value="Select All" id="Helper:CopyLog"></td>' +
			'<td colspan="2" align=center>' +
			'<input type="button" class="custombutton" value="Clear" id="Helper:ClearLog"></td>' +
			'</tr></table>';
		document.getElementById("Helper:CopyLog").addEventListener("click", Helper.notepadCopyLog, true);
		document.getElementById("Helper:ClearLog").addEventListener("click", Helper.notepadClearLog, true);
	},

	notepadCopyLog: function() {
		var combatLog=document.getElementById("Helper:CombatLog")
		combatLog.focus();
		combatLog.select();
	},

	notepadClearLog: function() {
		if (window.confirm("Are you sure you want to clear your log?")) {
			var combatLog=document.getElementById("Helper:CombatLog");
			combatLog.innerHTML="";
			GM_setValue("CombatLog", "");
		}
	},

	guildRelationship: function(txt) {
		var guildSelf = GM_getValue("guildSelf");
		var guildFrnd = GM_getValue("guildFrnd");
		var guildPast = GM_getValue("guildPast");
		var guildEnmy = GM_getValue("guildEnmy");
		if (!guildSelf) {
			guildSelf="";
			GM_setValue("guildSelf", guildSelf);
		}
		if (!guildFrnd) {
			guildFrnd="";
			GM_setValue("guildFrnd", guildFrnd);
		}
		if (!guildPast) {
			guildPast="";
			GM_setValue("guildPast", guildPast);
		}
		if (!guildEnmy) {
			guildEnmy="";
			GM_setValue("guildEnmy", guildEnmy);
		}
		guildSelf=guildSelf.toLowerCase().replace(/\s*,\s*/,",").split(",");
		guildFrnd=guildFrnd.toLowerCase().replace(/\s*,\s*/,",").split(",");
		guildPast=guildPast.toLowerCase().replace(/\s*,\s*/,",").split(",");
		guildEnmy=guildEnmy.toLowerCase().replace(/\s*,\s*/,",").split(",");
		if (guildSelf.indexOf(txt.toLowerCase())!=-1) return "self";
		if (guildFrnd.indexOf(txt.toLowerCase())!=-1) return "friendly";
		if (guildPast.indexOf(txt.toLowerCase())!=-1) return "old";
		if (guildEnmy.indexOf(txt.toLowerCase())!=-1) return "enemy";
		return "";
	}
};

Helper.onPageLoad(null);