Fallen Sword Helper is a Greasemonkey script meant to enhance the experience of playing Fallen Sword, by removing repetitive tasks, presenting more information at a glance, enhancing the social aspect of the game and creating shortcuts to common tasks.



# History #

The Fallen Sword Helper was created on 9/23/2008 by Cocinella.  It was originally found on userscripts.org On Nov 21, 2008.  At this point it was a script Created by Cocinella and Jesiegel. It was finally fully moved over to code.google.com And Tangtop started assiting with coding at this time.  Shortly thereafter dkwizard, Nabalac and Ananasii started to help with the coding and getting new ideas for the project to make it what it is today.

# Disclaimer #

This is a personal project, which I created just for fun. Of course I was happily surprised that quite a lot of people seem to like it, even contribute to it. I'm in no way affiliated with Hunted Cow Studios (creators of Fallen Sword) nor do I have any claims on the trademark - after all Fallen Sword Helper only exists under the wings of Fallen Sword :). This project is funded out of my personal time and done solely as a hobby, so (a) don't make irrational demands (b) don't offer me money (I already have a day job :)). If you come across me at the game, I would of course appreciate if you didn't attack me, or an occasional buff, but don't feel I'm entitled to any special treatment because of the script. That being said, I really (I mean _really_ - it makes my day) appreciate any other form of admiration, such as PMs or comments on this site :). Also, as you can see changes are (at least for now) very frequent.

# Features #

Actually, since features are added very frequently, there may be a lot more than those described below. Perhaps you're better off reading the ChangeLog. I have consolidated everything from the changelog up to now. This is based on [revision 382](https://code.google.com/p/fallenswordhelper/source/detail?r=382).

## Layout and coloring ##
  1. When viewing the profile of a user, the name color changes to reflect their guild relationship with your own, green for your own guild, yellow for friendly guilds and gray for enemy guilds.
  1. When you try to dispose of an item, it retrieves data from the server to find out about the item color, and paints the text of the item with that color. This makes it easy to get rid of e.g. all white (common) items.
  1. The logs (chat, character log and guild log) are colored based on the age of the message. New messages since your last visit are yellow background, messages older than 20 minutes will have a brown background.
  1. Option in guild log chat to dim recall messages not associated with self.
  1. Option to move the FSbox on the left (for higher visibility).
  1. Option to remove "new?" box (to gain some space).
  1. Option to hide guild avatar (logo).
  1. Option to hide extra guild info.
  1. Option to hide banner.
  1. Guild Advisor is sortable, by clicking on the columns. Click again to reverse direction.
  1. On the player log screen, guildmates are colored green.
  1. Option to compress other players bios to a shorter length with a link to show all when clicked.

## Quick links ##
  1. A list of all members of the guild that are currently online is displayed. You can directly buff a player from that list. Any player that has logged in in the last 15 seconds or so, is displayed in yellow (the guild list is not retrieved from server if it has been updated less than 15 seconds ago).
  1. A chat box is displayed, with the latest 10 (configurable - set to 0 to disable) chat messages. This only updates when needed.
  1. Link to guild bank from personal bank.
  1. Extra link buttons to profile page to buff player, see their actions or start a secure trade with them.
  1. Extra link buttons to rank a player (for guild founders) in player profile page.
  1. Added link to message logs to trade, or secure trade with the player that sent the message.
  1. Instant Portal to Krul button added to world screen with warning when clicked.
  1. Link for medal guide.
  1. Added fast recall function to guild>report page to recall items without a page refresh.
  1. Online status checker for top 250 players. Checks each of the guilds on the page to fetch which players are online and then adds the online icon from the guild page to the top 250 page. You have to press a button to trigger it. Takes a few seconds (5-10ish) but not too bad.
  1. Links to quick buff a player are added to most places.
  1. You can also move around from the map (of course you won't be able to kill anything, or go to another level - it's just meant as a shortcut).

## Extra Information ##
  1. Stamina calculator displays estimated time for when stamina will be full.
  1. Quest book has been updated to show level and location of each quest, (optionally) hide completed quests, and even show quests you might have missed.
  1. The quickbuff window displays character statistics of the player being buffed, their current buffs, and last activity. Your low level skills will be displayed in gray.
  1. Combat group statistics are automatically (when pressing a button) displayed on Groups page. They include any mercenaries, the level of the group creator, and the minimum level you need to join.
  1. Creature evaluator displays several statistics when on the "View Creature" page, effectively calculating a probability of winning or losing. Several buffs are also used for the calculation.
  1. Added counter to profile screen for the number of allies/enemies you have and the total available (so you can see if you have spare ally/enemy slots you can use.
  1. In guild management report (recall) page, the list of guild members is used to show which members are online.
  1. A relic defender calculator is displayed, when you're about to capture a relic, that does everything except check for inactive players.
  1. There's an option to save (keep) combat logs and retrieve them from a new page.
  1. Bio and History editors now have preview panes as you type, complete with total allowable bio characters (that turn red when you exceed them)
  1. On the questbook page all completed quests are hidden and all incomplete quests from other pages are also loaded and displayed (optional).
  1. Displays calculated one-hit damage required into "View Creature" mouseover.

## Auction House ##
  1. Auction house displays item craft and hellforge attributes.
  1. In auction house pages, text about the offered item is automatically retrieved.
  1. Auction one click bid and buyout functionality added. You can now bid on or buyout an item with one click. If there is already a bid, the required outbid value is displayed.
  1. Quick Potion Search function added to auction screen that puts one click links for searching for popular higher level potions.
  1. When on the drop item page, you can immediately search the item in the auction house, or even sell it.
  1. Show links in the drop items page to search item in Auction House.
  1. Added navigation to top of auction screen for Auction House. Also added buttons to go to first and last page, and ability to hide auction text.
  1. Crude but effective Quick Plant Search added.
  1. Added AH search for relevant plant from inventing screen.
  1. AH Quick search is customisable
  1. Auction house preferences are inline, meaning you don't need to open a new page to set preferences.

## New screens ##
  1. Quest Manager displays all quests in one big sortable table, with levels and locations, and also to wiki.fallensword.com and fallen sword guide.
  1. Personal and Guild Inventory Managers displays all items worn or in backpack (for personal IM) or in guild store or worn by members (for guild IM) with their respective bonuses (attack, defense, damage, armor). You can now better decide what to wear
  1. Recipe manager along with options to hide recipes.
  1. Find buffs screen to search guild mates, profiles and online players to find the buff you need.

## World Additions ##
  1. Footprints functionality. When you select the checkbox under the map, you can see where you've been (useful to track down creatures)
  1. Quick Kill functionality - you can optionally kill monsters as usual but with no new page opening or even quick kill all monsters of a single type.
  1. In quick kill, you can hover you mouse over the battle result to see a hit by hit combat report.
  1. In quick kill, any looted item is also displayed.
  1. You can see shield imps and if you're missing hunting buffs at the world page. Hunting buff list is customizable and can also be disabled.
  1. Added next level calculator, based only on level gain.
  1. Mouseover the "View Creature" button displays the data that would be retrieved from that page.
  1. Kill streak is displayed at the world screen if DD buff is active.
  1. More visible combat log that is displayed under the monster list, together with chance buffs or level up/down message. Use page up and page down to scroll combat log.
  1. Added text to world summary when quick kill is running to notify you if a shield imp got killed by that particular monster.

## System ##
  1. Combat logs are saved and can be exported to be used with any external program.
  1. Key handling routine replaced from inside the script (to handle stuff like chat). "0" key works on any screen, effectively either going back to the "world" page or refreshing it.
  1. Preferences page has customizations for most of the functionality (mainly enable/disable).
  1. Auto update functionality - every six hours a request is made to see if there's a new version.

## Ingame Shortcut Keys and Links ##
  1. Moving: a, w, d, x, q, e, c, z as without this script
  1. Moving: left, right, up, down arrow
  1. Repair: r as without this script
  1. Quick kill monster without going away from world screen: number 1 - 8
  1. Create group/squad: G (Shift + g)
  1. Go to guild/faction page: g
  1. Join all groups/squad: j
  1. Back pack: b
  1. Return to world page: 0
  1. Open map: m (map opened in new tab)
  1. Go to profile/datasheet: p
  1. Open mini map: n
  1. Use stairs (if available): s
  1. Auto-Move in mini map: N (after open mini map and have selected the path with your mouse)
  1. Move to next/previous page: > < (only works in pages that have ">", "<" button to move, such as AH/TH, log page)
  1. Change combat set: Shift + # where # is a number from 1 to 9 (Only for QWERTY keyboard layouts - for more info see [issue 698](https://code.google.com/p/fallenswordhelper/issues/detail?id=698))
  1. Scroll combat log: `PgUp`, `PgDn` (only in world page with visible combat log)
  1. Toggle footprint: `[x]` or `[v]` icons under world map in world screen
  1. Quick gold/credit send: y - or gold/credit icon under world map in world screen (must enable this feature in Preference/Config page first)
  1. Quick buy: t (in shop, after an item has been chosen from the top right list)
  1. Quick wear manager: v
### Sigmastorm2 Specific Keys and Links ###
  1. Open shop, augmentation center, engineering center, using health center: = (you must be at the shop, center)
  1. Quick heal: h (you need to have your class healing skill, and have enough in skill power bar)
  1. Quick heal link: the heart icon on the left of the health bar
  1. Quick class skill cast: the class icon on the right of the skill power bar
  1. Quick cast Mental Strength: i, Quick remove Mental Strength: I (Shift+i)
  1. Quick cast Mind Shard: k
  1. Quick cast Mind Stone: K
  1. Quick use item: {, }, | (must setup first from Q\_Use in Data Sheet)
  1. Load ammo: l (will look at main folder first)
  1. Combine psi charged ammo: L
  1. Open map: M (map opened in new tab) (note: m is for medikit as without SS2Helper)

My Fallensword in-game name is Coccinella - feel free to contact me for any questions or remarks. For Sigmastorm2, please contact [dkwizard](http://www.sigmastorm2.com/index.php?cmd=profile&player_id=1191381).

[Installation](Installation.md)
[FAQ](FAQ.md)