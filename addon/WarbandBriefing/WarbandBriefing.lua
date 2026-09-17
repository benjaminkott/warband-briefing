--[[
  Warband Briefing Companion
  -----------------
  Optional. The app reads SavedInstances without it, and this addon never
  replaces it - it fills the gaps that one cannot:

    * the Great Vault as the client itself sees it, rewards included. No
      community addon records what is actually in the vault, because the client
      only knows once it has asked the server for it. `OnUIInteract` triggers
      exactly that request at login, without opening the vault window.
    * the weekly reset the realm actually runs on, so the app never has to
      infer it from a timezone rule.
    * the season's best run per dungeon, which is what the rating is made of.
    * the worn gear as the tooltip describes it - item level, enchant, sockets
      and upgrade track per slot - and the renown standing per faction.
    * the professions with their concentration, and the calendar's running
      events - the timewalking week, the bonus event, the brawl.
    * the quest log with each quest's progress and whether it is ready to
      turn in, and the quests turned in this week - so a weekly on the way
      reads as more than "not done".
    * a register of every quest any character had on its log, with what the
      client says about it: weekly or daily, meta, the expansion, the
      profession. It outlives the reset, so the app knows the season's
      weeklies from the game itself, not from a list somebody wrote.
    * a register of icons: the file id of the icon of every item, currency,
      recipe and profession any character had in view. The app shows the
      game's own icon for an id, fetched by that file id and kept.
    * the bags of each character at every save, its bank and the warband
      bank at every visit to the bank: tab by tab, stacks of an item summed,
      with the link that names the item.
    * a register of tooltips: the lines the client shows for every item in
      a bag, a bank tab or a worn slot, with their colours. The app shows
      them when the pointer rests on the item, as the game would.
    * the gold of the warband bank at every save, the gold of a guild bank
      at every visit, the auctions while the auction house is open and the
      mail while the mailbox is: what the app read from a bag addon before.

  WoW writes SavedVariables on logout or `/reload` - until then the app sees
  nothing new.
]]

local ADDON_NAME = ...
local DB_VERSION = 10

WarbandBriefingDB = WarbandBriefingDB or {}

local WarbandBriefing = {}
_G.WarbandBriefing = WarbandBriefing

---------------------------------------------------------------------------
-- Helpers
---------------------------------------------------------------------------

--- Mirrors the realm-slug rules Blizzard uses, so the app joins this addon's
--- characters onto the same key the other sources produce.
local function Slugify(name)
  if not name then return "" end
  name = name:gsub("'", "")
  name = name:gsub("%s+", "-")
  local map = {
    ["à"]="a", ["á"]="a", ["â"]="a", ["ä"]="ae", ["ã"]="a", ["å"]="a",
    ["è"]="e", ["é"]="e", ["ê"]="e", ["ë"]="e",
    ["ì"]="i", ["í"]="i", ["î"]="i", ["ï"]="i",
    ["ò"]="o", ["ó"]="o", ["ô"]="o", ["ö"]="oe", ["õ"]="o",
    ["ù"]="u", ["ú"]="u", ["û"]="u", ["ü"]="ue",
    ["ñ"]="n", ["ç"]="c", ["ß"]="ss",
  }
  name = name:lower()
  for from, to in pairs(map) do
    name = name:gsub(from, to)
  end
  return name
end

--- The name of an enum value, so the file says "Weekly" and not a number
--- that the next patch can move. The number itself where the enum is gone.
local function EnumName(enum, value)
  if value == nil then return nil end
  if type(enum) == "table" then
    for name, number in pairs(enum) do
      if number == value then return name end
    end
  end
  return tostring(value)
end

--- The client's calendar table as a timestamp. It is local time, which is
--- what `time` expects; the app only ever shows it as "on Tuesday".
local function CalendarToTime(date)
  if type(date) ~= "table" or not date.year then return nil end
  local ok, stamp = pcall(time, {
    year = date.year, month = date.month, day = date.monthDay,
    hour = date.hour or 0, min = date.minute or 0,
  })
  if ok then return stamp end
end

---------------------------------------------------------------------------
-- Great Vault
---------------------------------------------------------------------------

-- The enum values move between patches, so the mapping is built at runtime
-- rather than written out as numbers.
local function VaultCategories()
  local T = Enum and Enum.WeeklyRewardChestThresholdType
  local out = {}
  if not T then return out end
  if T.Activities then out[T.Activities] = "mythicPlus" end
  if T.MythicPlus then out[T.MythicPlus] = "mythicPlus" end
  if T.Raid then out[T.Raid] = "raid" end
  if T.World then out[T.World] = "world" end
  return out
end

--- Item level and name of what a slot is holding.
---
--- Two sources, in order: the reward the server actually put in the slot, and
--- failing that the example the client shows for the progress made so far. The
--- example is what an unfinished slot has, and it is still the useful number -
--- it says what filling that slot would be worth.
local function RewardInfo(activity)
  if not activity then return nil, nil end

  local link
  local rewards = activity.rewards
  if type(rewards) == "table" then
    for _, reward in ipairs(rewards) do
      if reward.itemLink and reward.itemLink ~= "" then
        link = reward.itemLink
        break
      end
      if reward.itemDBID and C_Item and C_Item.GetItemLinkByGUID then
        local ok, byGuid = pcall(C_Item.GetItemLinkByGUID, reward.itemDBID)
        if ok and byGuid and byGuid ~= "" then
          link = byGuid
          break
        end
      end
    end
  end

  if not link and activity.id and C_WeeklyRewards and C_WeeklyRewards.GetExampleRewardItemHyperlinks then
    local ok, example = pcall(C_WeeklyRewards.GetExampleRewardItemHyperlinks, activity.id)
    if ok and type(example) == "string" and example ~= "" then link = example end
  end

  if not link then return nil, nil end

  local ilvl
  local ok, detailed = pcall(GetDetailedItemLevelInfo, link)
  if ok and type(detailed) == "number" and detailed > 0 then ilvl = detailed end

  -- Everything between the brackets is the item's own name, in client language.
  return ilvl, link:match("%[(.-)%]")
end

--- The Great Vault: three rows of three slots, as the client reports them.
local function CollectVault()
  if not C_WeeklyRewards or not C_WeeklyRewards.GetActivities then return nil end
  local categories = VaultCategories()
  local vault = { mythicPlus = {}, raid = {}, world = {} }

  local ok, activities = pcall(C_WeeklyRewards.GetActivities)
  if not ok or type(activities) ~= "table" then return nil end

  for _, activity in ipairs(activities) do
    local category = categories[activity.type]
    if category and vault[category] then
      local threshold = activity.threshold or 0
      local progress = activity.progress or 0
      local rewardIlvl, rewardItem = RewardInfo(activity)
      table.insert(vault[category], {
        threshold  = threshold,
        progress   = progress,
        -- Keystone level, delve tier - and for the raid row the difficulty id.
        level      = activity.level or 0,
        rewardIlvl = rewardIlvl,
        rewardItem = rewardItem,
        unlocked   = progress >= threshold and threshold > 0,
        index      = activity.index or 0,
      })
    end
  end

  for _, slots in pairs(vault) do
    table.sort(slots, function(a, b) return a.threshold < b.threshold end)
  end
  return vault
end

--- Whether a finished week's reward is still sitting in the vault. The client
--- knows this outright, so the app does not have to infer it from an old
--- snapshot with filled slots.
local function HasAvailableRewards()
  if not C_WeeklyRewards or not C_WeeklyRewards.HasAvailableRewards then return nil end
  local ok, available = pcall(C_WeeklyRewards.HasAvailableRewards)
  if not ok then return nil end
  return available and true or false
end

---------------------------------------------------------------------------
-- Mythic+
---------------------------------------------------------------------------

local function MapName(mapId)
  if not mapId or not C_ChallengeMode or not C_ChallengeMode.GetMapUIInfo then return nil end
  local ok, name = pcall(C_ChallengeMode.GetMapUIInfo, mapId)
  if ok then return name end
end

--- Every Mythic+ run of the current week, repeat runs of a dungeon included.
local function CollectRuns()
  if not C_MythicPlus or not C_MythicPlus.GetRunHistory then return nil end
  local ok, history = pcall(C_MythicPlus.GetRunHistory, false, true)
  if not ok or type(history) ~= "table" then return nil end

  local runs = {}
  for _, run in ipairs(history) do
    table.insert(runs, {
      mapId       = run.mapChallengeModeID,
      name        = MapName(run.mapChallengeModeID),
      level       = run.level,
      completed   = run.completed and true or false,
      score       = run.runScore,
      completedAt = CalendarToTime(run.completionDate),
    })
  end
  table.sort(runs, function(a, b) return (a.level or 0) > (b.level or 0) end)
  return runs
end

--- The season's best run per dungeon. The client keeps the best in-time and
--- the best overtime run apart; whichever is worth more is the one the rating
--- counts, so that is the one recorded.
local function CollectDungeonBests()
  if not C_ChallengeMode or not C_ChallengeMode.GetMapTable then return nil end
  if not C_MythicPlus or not C_MythicPlus.GetSeasonBestForMap then return nil end
  local ok, maps = pcall(C_ChallengeMode.GetMapTable)
  if not ok or type(maps) ~= "table" then return nil end

  local out = {}
  for _, mapId in ipairs(maps) do
    local ok2, inTime, overTime = pcall(C_MythicPlus.GetSeasonBestForMap, mapId)
    if ok2 then
      local best, timed = inTime, true
      if overTime and (not best or (overTime.dungeonScore or 0) > (best.dungeonScore or 0)) then
        best, timed = overTime, false
      end
      -- A dungeon never run has no entry at all; the app draws that as empty.
      if best and (best.level or 0) > 0 then
        table.insert(out, {
          mapId       = mapId,
          name        = MapName(mapId),
          level       = best.level,
          inTime      = timed,
          score       = best.dungeonScore or 0,
          durationSec = best.durationSec,
        })
      end
    end
  end
  return out
end

--- The season's dungeons, run or not. The bests above list only the ones
--- run, so without this the app cannot tell a dungeon never run from one
--- that is not in the season - and the one never run is the weakest key.
local function CollectSeasonDungeons()
  if not C_ChallengeMode or not C_ChallengeMode.GetMapTable then return nil end
  local ok, maps = pcall(C_ChallengeMode.GetMapTable)
  if not ok or type(maps) ~= "table" then return nil end
  local out = {}
  for _, mapId in ipairs(maps) do
    table.insert(out, { mapId = mapId, name = MapName(mapId) })
  end
  -- An empty table is the client before the season's data is in; keep the last one.
  if #out == 0 then return nil end
  return out
end

---------------------------------------------------------------------------
-- Registers: icons, item classes, tooltips
---------------------------------------------------------------------------

--- The register of icons: for each kind (items, currencies, recipes,
--- professions) the icon's file id by the entity's id. Account-wide and
--- never pruned, like the quests: an icon does not change, and the app
--- wants it for a character no companion has seen. The file id is the
--- client's own (`Interface/Icons/...` as a number); the app resolves it to
--- the picture.
local function RegisterIcon(kind, id, fileId)
  local icons = WarbandBriefingDB.icons
  if not icons or not id or type(fileId) ~= "number" or fileId <= 0 then return end
  local list = icons[kind]
  if not list then
    list = {}
    icons[kind] = list
  end
  list[tostring(id)] = fileId
end

--- What an item is: the client's class and subclass as one code
--- (class * 100 + subclass), in the same register, so the app can sort a
--- bag into the groups a bag addon draws. Known to the client without a
--- server round trip; a potion is 0 01, a piece of armor 4 xx.
--- Returns the class, so a caller can tell a piece of gear.
local function RegisterItemClass(itemId)
  local icons = WarbandBriefingDB.icons
  if not icons or not itemId or not (C_Item and C_Item.GetItemInfoInstant) then return nil end
  local ok, _, _, _, _, _, classId, subclassId = pcall(C_Item.GetItemInfoInstant, itemId)
  if not ok or type(classId) ~= "number" then return nil end
  local list = icons.classes
  if not list then
    list = {}
    icons.classes = list
  end
  list[tostring(itemId)] = classId * 100 + (subclassId or 0)
  return classId
end

--- Weapons and armor: the item level is the number on the tile, not the count.
local GEAR_CLASSES = { [2] = true, [4] = true }

--- A tooltip has this many lines at most: an item's runs to a dozen, and
--- a set's list of bonuses to twenty; more is a description nobody reads
--- in a hover.
local MAX_TOOLTIP_LINES = 30

--- The game's colour of a tooltip line as six hex digits, or nil for the
--- plain white most lines have: the app paints the default itself.
local function HexOf(color)
  if type(color) ~= "table" or type(color.r) ~= "number" then return nil end
  local r, g, b = color.r, color.g, color.b
  if r >= 0.99 and g >= 0.99 and b >= 0.99 then return nil end
  return string.format("%02x%02x%02x", math.floor(r * 255 + 0.5), math.floor(g * 255 + 0.5), math.floor(b * 255 + 0.5))
end

--- Registers an item's tooltip by id, line by line: the left text, the
--- right text where the line has one (a slot and its armour type), and
--- the game's colour of each where it is not white. Kept account-wide
--- like the icons, but a later look overwrites an earlier one: a tooltip
--- changes with the season. Keyed by the id, so two copies of a piece of
--- gear share one tooltip - the last one seen.
local function RegisterTooltip(id, data)
  local tooltips = WarbandBriefingDB.tooltips
  if not tooltips or not id or type(data) ~= "table" or type(data.lines) ~= "table" or #data.lines == 0 then return end
  tooltips.items = tooltips.items or {}
  local out = {}
  for i, line in ipairs(data.lines) do
    if i > MAX_TOOLTIP_LINES then break end
    local entry = { l = type(line.leftText) == "string" and line.leftText or "" }
    if type(line.rightText) == "string" and line.rightText ~= "" then entry.r = line.rightText end
    entry.lc = HexOf(line.leftColor)
    entry.rc = HexOf(line.rightColor)
    out[i] = entry
  end
  tooltips.items[tostring(id)] = out
end

---------------------------------------------------------------------------
-- Bags and banks
---------------------------------------------------------------------------

--- One container out of a set of bags: its space, and what is in it with
--- stacks of one item summed - "60 potions" is the answer, not three
--- stacks of 20. The link carries the name; the icon goes to the register,
--- since an icon is the same for every stack of the item anywhere. The
--- space is counted over `spaceBags` only: a free reagent slot is no room
--- for a drop, so the bags leave the reagent bag out of it, its items in.
local function CollectContainer(itemBags, spaceBags)
  if not (C_Container and C_Container.GetContainerItemInfo and C_Container.GetContainerNumSlots) then return nil end
  local items, byId = {}, {}
  local slots, free = 0, 0
  for _, bag in ipairs(itemBags) do
    local ok, count = pcall(C_Container.GetContainerNumSlots, bag)
    for slot = 1, (ok and count) or 0 do
      local ok2, info = pcall(C_Container.GetContainerItemInfo, bag, slot)
      if ok2 and info and info.itemID then
        RegisterIcon("items", info.itemID, info.iconFileID)
        local classId = RegisterItemClass(info.itemID)
        local known = byId[info.itemID]
        if known then
          known.count = known.count + (info.stackCount or 1)
        else
          -- The tooltip once per item, off the first stack: the slot's own
          -- tooltip has the item's data loaded, where a link's may not.
          if C_TooltipInfo and C_TooltipInfo.GetBagItem then
            local okt, data = pcall(C_TooltipInfo.GetBagItem, bag, slot)
            if okt then RegisterTooltip(info.itemID, data) end
          end
          local item = {
            id      = info.itemID,
            count   = info.stackCount or 1,
            quality = info.quality,
            link    = info.hyperlink,
          }
          if classId and GEAR_CLASSES[classId] and info.hyperlink then
            local okl, detailed = pcall(GetDetailedItemLevelInfo, info.hyperlink)
            if okl and type(detailed) == "number" and detailed > 0 then item.ilvl = detailed end
          end
          byId[info.itemID] = item
          items[#items + 1] = item
        end
      end
    end
  end
  for _, bag in ipairs(spaceBags) do
    local ok, count = pcall(C_Container.GetContainerNumSlots, bag)
    local ok2, empty = pcall(C_Container.GetContainerNumFreeSlots, bag)
    if ok and ok2 and (count or 0) > 0 then
      slots = slots + count
      free = free + (empty or 0)
    end
  end
  if slots == 0 and #items == 0 then return nil end
  return { slots = slots, free = free, items = items }
end

local REGULAR_BAGS = { 0, 1, 2, 3, 4 }
local ALL_BAGS = { 0, 1, 2, 3, 4, 5 }

--- The bags as one container, the reagent bag's items in it, its slots not.
local function CollectBags()
  return CollectContainer(ALL_BAGS, REGULAR_BAGS)
end

--- A bank, tab by tab, as the client lists the tabs the account bought:
--- each tab is one bag, and its name is the one the player gave it. Only
--- readable while the bank is open; nil otherwise, so a save away from the
--- bank keeps the last visit's tabs. A client before the character bank
--- got tabs lists none for it.
local function CollectBankTabs(bankType)
  if not (C_Bank and C_Bank.FetchPurchasedBankTabData) then return nil end
  local ok, tabs = pcall(C_Bank.FetchPurchasedBankTabData, bankType)
  if not ok or type(tabs) ~= "table" or #tabs == 0 then return nil end
  local out = {}
  for _, tab in ipairs(tabs) do
    local container = CollectContainer({ tab.ID }, { tab.ID })
    if container then
      container.name = tab.name
      out[#out + 1] = container
    end
  end
  if #out == 0 then return nil end
  return out
end

---------------------------------------------------------------------------
-- Gear
---------------------------------------------------------------------------

--- The upgrade line of a tooltip, matched against the client's own format
--- string ("Upgrade Level: Champion 4/8") so it works in every language.
local upgradePattern
local function UpgradeTrack(lines)
  if not upgradePattern then
    local format = _G.ITEM_UPGRADE_TOOLTIP_FORMAT_STRING
    if type(format) ~= "string" then return nil end
    -- Escape the literal characters, then let the two placeholders match.
    upgradePattern = "^" .. format:gsub("[%(%)%.%%%+%-%*%?%[%]%^%$]", "%%%0")
      :gsub("%%%%s", "(.-)"):gsub("%%%%d", "(%%d+)") .. "$"
  end
  for _, line in ipairs(lines) do
    local text = line.leftText
    if type(text) == "string" then
      local track, step, steps = text:match(upgradePattern)
      if track then return string.format("%s %s/%s", track, step, steps) end
    end
  end
end

--- What is worn, slot by slot. The link says which item and whether it is
--- enchanted; the tooltip is the only place that says how many sockets it
--- has and how far up its track it is. Empty slots are simply absent.
local function CollectGear()
  local out = {}
  local socketType = Enum and Enum.TooltipDataLineType and Enum.TooltipDataLineType.GemSocket
  for slot = 1, 17 do
    -- The shirt (slot 4) is cosmetic; the tabard sits past 17 anyway.
    if slot ~= 4 then
      local link = GetInventoryItemLink("player", slot)
      if link then
        local fields = link:match("|Hitem:([^|]*)|h")
        local itemId, enchant, gem1, gem2, gem3, gem4 = strsplit(":", fields or "")
        if GetInventoryItemTexture then
          local okt, texture = pcall(GetInventoryItemTexture, "player", slot)
          if okt then RegisterIcon("items", tonumber(itemId), texture) end
          RegisterItemClass(tonumber(itemId))
        end
        local gems = 0
        for _, gem in ipairs({ gem1, gem2, gem3, gem4 }) do
          if tonumber(gem) and tonumber(gem) > 0 then gems = gems + 1 end
        end

        local sockets, track = nil, nil
        if C_TooltipInfo and C_TooltipInfo.GetInventoryItem then
          local ok, data = pcall(C_TooltipInfo.GetInventoryItem, "player", slot)
          if ok and type(data) == "table" and type(data.lines) == "table" then
            RegisterTooltip(tonumber(itemId), data)
            sockets = 0
            for _, line in ipairs(data.lines) do
              if socketType and line.type == socketType then sockets = sockets + 1 end
            end
            track = UpgradeTrack(data.lines)
          end
        end

        local ilvl
        local ok2, detailed = pcall(GetDetailedItemLevelInfo, link)
        if ok2 and type(detailed) == "number" and detailed > 0 then ilvl = detailed end

        local quality = C_Item and C_Item.GetItemQualityByID and C_Item.GetItemQualityByID(link)
        -- Crafted items carry a quality icon after the name; the icon is markup.
        local itemName = link:match("%[(.-)%]")
        if itemName then itemName = itemName:gsub("%s*|A:[^|]*|a", "") end
        table.insert(out, {
          slot      = slot,
          itemId    = tonumber(itemId),
          name      = itemName,
          ilvl      = ilvl,
          enchantId = tonumber(enchant) or 0,
          sockets   = sockets,
          gems      = gems,
          track     = track,
          quality   = quality,
          -- The whole link: the bonus ids in it describe the item as it is.
          link      = link,
        })
      end
    end
  end
  return out
end

---------------------------------------------------------------------------
-- Reputation
---------------------------------------------------------------------------

--- After the maximum level, reputation continues in paragon cycles. The
--- client counts the total; the progress in the cycle is the remainder.
local function ParagonOf(factionId)
  if not (C_Reputation and C_Reputation.IsFactionParagon) then return nil end
  local ok, isParagon = pcall(C_Reputation.IsFactionParagon, factionId)
  if not ok or not isParagon then return nil end
  local ok2, value, threshold, _, rewardPending = pcall(C_Reputation.GetFactionParagonInfo, factionId)
  if not ok2 or type(threshold) ~= "number" or threshold <= 0 then return nil end
  return {
    current       = rewardPending and threshold or ((value or 0) % threshold),
    max           = threshold,
    rewardPending = rewardPending and true or false,
  }
end

--- Renown per major faction of the current expansion. Asked without an
--- expansion the client lists every faction it ever had, all of them long
--- maxed, so the expansion is named - and checked again on the answer.
local function CollectRenown()
  if not C_MajorFactions or not C_MajorFactions.GetMajorFactionIDs then return nil end
  local expansion = GetExpansionLevel and GetExpansionLevel() or nil
  local ok, ids = pcall(C_MajorFactions.GetMajorFactionIDs, expansion)
  if not ok or type(ids) ~= "table" then return nil end

  local out = {}
  for _, factionId in ipairs(ids) do
    local ok2, data = pcall(C_MajorFactions.GetMajorFactionData, factionId)
    if ok2 and type(data) == "table" and data.isUnlocked
      and (not expansion or not data.expansionID or data.expansionID == expansion) then
      local maxed = false
      if C_MajorFactions.HasMaximumRenown then
        local ok3, atMax = pcall(C_MajorFactions.HasMaximumRenown, factionId)
        maxed = ok3 and atMax or false
      end
      local paragon = maxed and ParagonOf(factionId) or nil
      table.insert(out, {
        factionId = factionId,
        name      = data.name,
        level     = data.renownLevel or 0,
        current   = data.renownReputationEarned or 0,
        max       = data.renownLevelThreshold or 0,
        maxed     = maxed,
        paragon   = paragon,
      })
    end
  end
  return out
end

--- Every other reputation of the character: the minor factions, the
--- friendships, the delve companion. The list has no expansion filter, so
--- the addon writes all of them; the app keeps the ones of the season. A
--- friendship counts in ranks; a standing counts in the eight reactions.
local function CollectReputations()
  if not (C_Reputation and C_Reputation.GetNumFactions and C_Reputation.GetFactionDataByIndex) then return nil end
  local ok, count = pcall(C_Reputation.GetNumFactions)
  if not ok or type(count) ~= "number" then return nil end

  local out = {}
  for index = 1, count do
    local ok2, data = pcall(C_Reputation.GetFactionDataByIndex, index)
    if ok2 and type(data) == "table" and data.factionID and data.factionID > 0
      and not (data.isHeader and not data.isHeaderWithRep) then
      local isMajor = C_Reputation.IsMajorFaction and C_Reputation.IsMajorFaction(data.factionID)
      if not isMajor then
        local level, maxLevel, current, max, maxed
        local friend = C_GossipInfo and C_GossipInfo.GetFriendshipReputation
          and C_GossipInfo.GetFriendshipReputation(data.factionID) or nil
        if friend and friend.friendshipFactionID and friend.friendshipFactionID > 0 then
          local ranks = C_GossipInfo.GetFriendshipReputationRanks
            and C_GossipInfo.GetFriendshipReputationRanks(data.factionID) or nil
          level    = ranks and ranks.currentLevel or 0
          maxLevel = ranks and ranks.maxLevel or 0
          local floor = friend.reactionThreshold or 0
          current  = (friend.standing or 0) - floor
          max      = friend.nextThreshold and (friend.nextThreshold - floor) or 0
          maxed    = friend.nextThreshold == nil or (maxLevel > 0 and level >= maxLevel)
        else
          level    = data.reaction or 0
          maxLevel = 8
          local floor = data.currentReactionThreshold or 0
          current  = (data.currentStanding or 0) - floor
          max      = (data.nextReactionThreshold or floor) - floor
          maxed    = level >= 8 or max <= 0
        end
        table.insert(out, {
          factionId = data.factionID,
          name      = data.name,
          level     = level,
          maxLevel  = maxLevel,
          current   = math.max(current, 0),
          max       = math.max(max, 0),
          maxed     = maxed and true or false,
          paragon   = maxed and ParagonOf(data.factionID) or nil,
        })
      end
    end
  end
  return out
end

---------------------------------------------------------------------------
-- Professions
---------------------------------------------------------------------------

--- The two primary professions: skill, and concentration where the profession
--- has it. Concentration refills on its own and stops at the cap, so a full
--- bar is regeneration thrown away - which is what the app points at. The
--- knowledge is the specialisation's currency: points earned and not yet
--- spent in the tree, the other thing a crafter forgets to do.
local function CollectProfessions()
  if not GetProfessions then return nil end
  local out = {}
  local first, second = GetProfessions()
  for _, index in ipairs({ first, second }) do
    if index then
      local name, icon, skill, maxSkill, _, _, skillLineId = GetProfessionInfo(index)
      if name then
        RegisterIcon("professions", skillLineId, icon)
        local profession = {
          name        = name,
          skillLineId = skillLineId,
          skill       = skill or 0,
          maxSkill    = maxSkill or 0,
        }
        -- Concentration belongs to the expansion's own skill line (Thalassian
        -- Blacksmithing), not to the parent the profession list names. The
        -- newest child that has a concentration currency is the current one.
        local currencyId
        if skillLineId and C_TradeSkillUI and C_TradeSkillUI.GetConcentrationCurrencyID then
          local children
          if C_TradeSkillUI.GetChildProfessionInfos then
            local okc, list = pcall(C_TradeSkillUI.GetChildProfessionInfos, skillLineId)
            if okc and type(list) == "table" then children = list end
          end
          local bestChild
          for _, child in ipairs(children or {}) do
            local ok, id = pcall(C_TradeSkillUI.GetConcentrationCurrencyID, child.professionID)
            if ok and id and id > 0 and (not bestChild or (child.professionID or 0) > (bestChild.professionID or 0)) then
              bestChild, currencyId = child, id
            end
          end
          if bestChild then
            profession.skill    = bestChild.skillLevel or profession.skill
            profession.maxSkill = bestChild.maxSkillLevel or profession.maxSkill
          end
          if C_ProfSpecs and C_ProfSpecs.GetCurrencyInfoForSkillLine then
            local okk, knowledge = pcall(C_ProfSpecs.GetCurrencyInfoForSkillLine, bestChild and bestChild.professionID or skillLineId)
            if okk and type(knowledge) == "table" and knowledge.quantity then
              profession.knowledge = knowledge.quantity
            end
          end
          if not currencyId then
            local ok, id = pcall(C_TradeSkillUI.GetConcentrationCurrencyID, skillLineId)
            if ok and id and id > 0 then currencyId = id end
          end
        end
        if currencyId and C_CurrencyInfo and C_CurrencyInfo.GetCurrencyInfo then
          local ok2, info = pcall(C_CurrencyInfo.GetCurrencyInfo, currencyId)
          if ok2 and info then
            profession.concentration = info.quantity or 0
            profession.concentrationMax = info.maxQuantity or 0
          end
        end
        table.insert(out, profession)
      end
    end
  end
  return out
end

--- The recipes with a cooldown, as the profession window last showed them.
--- The window is the only place the client tells, so the list is as fresh
--- as the last time it was open - which is also where the craft happens,
--- so a used cooldown is seen used. Ready is a cooldown that has run out;
--- a recipe with charges is ready while it has one.
local function ScanCooldowns(entry)
  if not (C_TradeSkillUI and C_TradeSkillUI.GetAllRecipeIDs and C_TradeSkillUI.GetRecipeCooldown) then return end
  -- Another player's linked window, or a vendor's, is not this character's.
  if C_TradeSkillUI.IsTradeSkillLinked and C_TradeSkillUI.IsTradeSkillLinked() then return end
  if C_TradeSkillUI.IsNPCCrafting and C_TradeSkillUI.IsNPCCrafting() then return end
  local ok, ids = pcall(C_TradeSkillUI.GetAllRecipeIDs)
  if not ok or type(ids) ~= "table" then return end
  entry.cooldowns = entry.cooldowns or {}
  local now = GetServerTime()
  for _, recipeId in ipairs(ids) do
    local okc, cooldown, _, charges, maxCharges = pcall(C_TradeSkillUI.GetRecipeCooldown, recipeId)
    if okc and (cooldown or (maxCharges and maxCharges > 0)) then
      local info
      if C_TradeSkillUI.GetRecipeInfo then
        local oki, i = pcall(C_TradeSkillUI.GetRecipeInfo, recipeId)
        if oki then info = i end
      end
      if not info or info.learned ~= false then
        if info then RegisterIcon("recipes", recipeId, info.icon) end
        entry.cooldowns[tostring(recipeId)] = {
          name       = info and info.name or nil,
          readyAt    = (cooldown and cooldown > 0) and (now + cooldown) or 0,
          charges    = charges,
          maxCharges = maxCharges,
          seenAt     = now,
        }
      end
    end
  end
end

---------------------------------------------------------------------------
-- Calendar
---------------------------------------------------------------------------

--- Since 12.0 the client hands addons "secret" values for anything that could
--- identify another player - a guild event's title, its organiser, even its
--- calendar type - and comparing, concatenating or saving one is a Lua error.
--- Holidays are public and come through in the clear; everything else is
--- skipped, field by field, rather than read.
local function IsSecret(value)
  return issecretvalue ~= nil and issecretvalue(value)
end

--- One calendar event as the save wants it, or nil when it is not a holiday
--- or any part of it is secret. Runs under pcall: a field the client makes
--- secret in a later build must not take the whole save down with it.
local function HolidayEvent(event)
  if type(event) ~= "table" then return nil end
  if IsSecret(event.calendarType) or IsSecret(event.title) then return nil end
  if event.calendarType ~= "HOLIDAY" or not event.title then return nil end
  return {
    title    = event.title,
    startsAt = CalendarToTime(event.startTime),
    endsAt   = CalendarToTime(event.endTime),
  }
end

--- Every holiday running today - the timewalking week, a bonus event, a brawl,
--- the faire. Read off the calendar, which has to have been opened once this
--- session (`C_Calendar.OpenCalendar` at login); until its data arrives this
--- returns nil and the previous save's list stands.
local function CollectEvents()
  if not C_Calendar or not C_Calendar.GetNumDayEvents or not C_DateAndTime then return nil end
  local ok, today = pcall(C_DateAndTime.GetCurrentCalendarTime)
  if not ok or type(today) ~= "table" then return nil end
  local ok2, count = pcall(C_Calendar.GetNumDayEvents, 0, today.monthDay)
  if not ok2 or not count or count == 0 then return nil end

  local out = {}
  for i = 1, count do
    local ok3, event = pcall(C_Calendar.GetDayEvent, 0, today.monthDay, i)
    local ok4, holiday = ok3 and pcall(HolidayEvent, event)
    if ok4 and holiday then table.insert(out, holiday) end
  end
  return out
end

---------------------------------------------------------------------------
-- Lockouts
---------------------------------------------------------------------------

--- Raid and dungeon lockouts, with the bosses already down.
local function CollectLockouts()
  local out = {}
  local count = GetNumSavedInstances and GetNumSavedInstances() or 0
  for i = 1, count do
    local name, _, reset, difficultyId, locked, extended, _, isRaid, maxPlayers, difficultyName,
          numEncounters, encounterProgress = GetSavedInstanceInfo(i)
    if name and (locked or extended) then
      local bosses, encounters = {}, {}
      for encounterIndex = 1, (numEncounters or 0) do
        local bossName, _, killed = GetSavedInstanceEncounterInfo(i, encounterIndex)
        if bossName then
          table.insert(encounters, { name = bossName, killed = killed and true or false })
          if killed then table.insert(bosses, bossName) end
        end
      end
      table.insert(out, {
        name         = name,
        difficulty   = difficultyName,
        difficultyId = difficultyId,
        isRaid       = isRaid and true or false,
        maxPlayers   = maxPlayers,
        defeated     = encounterProgress or #bosses,
        total        = numEncounters or 0,
        bosses       = bosses,
        -- Every boss of the instance in order, for the raid list when the journal is silent.
        encounters   = encounters,
        -- `reset` is a remaining runtime in seconds, not a timestamp.
        resetsAt     = reset and reset > 0 and (GetServerTime() + reset) or nil,
      })
    end
  end
  return out
end

local function CollectWorldBosses()
  local out = {}
  local count = GetNumSavedWorldBosses and GetNumSavedWorldBosses() or 0
  for i = 1, count do
    local name = GetSavedWorldBossInfo(i)
    if name then table.insert(out, { name = name, defeated = true }) end
  end
  return out
end

---------------------------------------------------------------------------
-- Raid progress
---------------------------------------------------------------------------

--- The raid difficulties the tally and the statistics know: LFR, normal, heroic, mythic.
local RAID_DIFFICULTIES = { 17, 14, 15, 16 }

--- The raids the journal walk found this session. The tier's raids do not
--- change while the client runs, and the walk is not free: see JournalRaids.
local journalRaidsCache = nil

--- The journal's selection before a walk, so the walk can put it back.
--- EJ_SelectTier and EJ_SelectInstance are not reads: they set the one
--- selection the client keeps for the journal, and every window that reads
--- it follows. A walk on every save left it on the last raid of the tier,
--- and the player's window jumped there every few seconds. Nil where the
--- client does not say.
local function JournalSelection()
  local tier, instance
  if EJ_GetCurrentTier then
    local ok, value = pcall(EJ_GetCurrentTier)
    if ok and type(value) == "number" then tier = value end
  end
  if EJ_GetCurrentInstance then
    local ok, value = pcall(EJ_GetCurrentInstance)
    if ok and type(value) == "number" and value > 0 then instance = value end
  end
  return tier, instance
end

local function RestoreJournalSelection(tier, instance)
  if tier then pcall(EJ_SelectTier, tier) end
  if instance then pcall(EJ_SelectInstance, instance) end
end

--- The raids of the expansion's tier as the Encounter Journal lists them,
--- each boss with its dungeon encounter id. The journal answers only once
--- its addon is loaded; the newest tier is asked first, an empty one is
--- skipped (a season tier without raids). Nil when the journal says nothing.
--- Walked once per session; the journal's selection is put back after.
local function JournalRaids(entry)
  if journalRaidsCache then
    entry.raidProgressNote = nil
    return journalRaidsCache
  end
  if C_AddOns and C_AddOns.LoadAddOn then pcall(C_AddOns.LoadAddOn, "Blizzard_EncounterJournal")
  elseif LoadAddOn then pcall(LoadAddOn, "Blizzard_EncounterJournal") end
  if not (EJ_GetNumTiers and EJ_SelectTier and EJ_GetInstanceByIndex and EJ_SelectInstance and EJ_GetEncounterInfoByIndex) then
    entry.raidProgressNote = "no journal api"
    return nil
  end
  local okTiers, tiers = pcall(EJ_GetNumTiers)
  if not okTiers or type(tiers) ~= "number" or tiers == 0 then
    entry.raidProgressNote = "no tiers: " .. tostring(tiers)
    return nil
  end
  local previousTier, previousInstance = JournalSelection()
  for tier = tiers, math.max(1, tiers - 2), -1 do
    pcall(EJ_SelectTier, tier)
    local raids = {}
    local index = 1
    while true do
      local ok, instanceId, instanceName = pcall(EJ_GetInstanceByIndex, index, true)
      if not ok or not instanceId then break end
      pcall(EJ_SelectInstance, instanceId)
      -- The world bosses of the expansion sit in the journal as a raid named
      -- after it, without difficulties; they are not a raid.
      local displaysDifficulty = true
      if EJ_GetInstanceInfo then
        local okInfo, _, _, _, _, _, _, _, shouldDisplayDifficulty = pcall(EJ_GetInstanceInfo, instanceId)
        if okInfo and shouldDisplayDifficulty == false then displaysDifficulty = false end
      end
      local bosses = {}
      local encounterIndex = 1
      while true do
        local ok2, bossName, _, journalEncounterId, _, _, _, dungeonEncounterId =
          pcall(EJ_GetEncounterInfoByIndex, encounterIndex, instanceId)
        if not ok2 or not bossName then break end
        if not dungeonEncounterId and EJ_GetEncounterInfo and journalEncounterId then
          local ok3, _, _, _, _, _, _, fromInfo = pcall(EJ_GetEncounterInfo, journalEncounterId)
          if ok3 then dungeonEncounterId = fromInfo end
        end
        table.insert(bosses, { name = bossName, id = dungeonEncounterId or journalEncounterId })
        encounterIndex = encounterIndex + 1
      end
      if #bosses > 0 and displaysDifficulty then
        table.insert(raids, { id = instanceId, name = instanceName, bosses = bosses })
      end
      index = index + 1
    end
    if #raids > 0 then
      RestoreJournalSelection(previousTier, previousInstance)
      journalRaidsCache = raids
      entry.raidProgressNote = nil
      return raids
    end
  end
  RestoreJournalSelection(previousTier, previousInstance)
  entry.raidProgressNote = "no raids in tiers " .. tostring(tiers) .. " down"
  return nil
end

--- The journal instances of the season's raids, as the vault's raid row
--- counts them: the client lists the encounters that fill it, each with its
--- instance. Empty when the client does not say.
local function SeasonRaidIds()
  local ids = {}
  if not (C_WeeklyRewards and C_WeeklyRewards.GetActivityEncounterInfo and Enum and Enum.WeeklyRewardChestThresholdType) then
    return ids
  end
  local raidType = Enum.WeeklyRewardChestThresholdType.Raid
  if not raidType then return ids end
  for index = 1, 3 do
    local ok, encounters = pcall(C_WeeklyRewards.GetActivityEncounterInfo, raidType, index)
    if ok and type(encounters) == "table" then
      for _, encounter in ipairs(encounters) do
        if type(encounter) == "table" and encounter.instanceID then ids[encounter.instanceID] = true end
      end
    end
  end
  return ids
end

--- The raids of the season out of the tier's: the ones the vault names,
--- when it names any; the whole tier otherwise.
local function SeasonRaids(raids)
  local ids = SeasonRaidIds()
  if next(ids) == nil then return raids, false end
  local season = {}
  for _, raid in ipairs(raids) do
    if ids[raid.id] then table.insert(season, raid) end
  end
  if #season == 0 then return raids, false end
  return season, true
end

--- The raids the week's lockouts know, every boss in the instance's order,
--- for a client whose journal gave nothing. A raid without a lockout this
--- week is not here - the journal is the fuller list.
local function LockoutRaids(lockouts)
  local raids, byName = {}, {}
  for _, lock in ipairs(lockouts or {}) do
    if lock.isRaid and lock.encounters and #lock.encounters > 0 and not byName[lock.name] then
      local bosses = {}
      for _, encounter in ipairs(lock.encounters) do table.insert(bosses, { name = encounter.name }) end
      local raid = { id = 0, name = lock.name, bosses = bosses }
      byName[lock.name] = raid
      table.insert(raids, raid)
    end
  end
  return raids
end

--- The client's statistics, once per session: every statistic's id and
--- name. The boss kills by difficulty are among them ("Ulgrax kills
--- (Heroic)"), counted since the character's first kill - the season's
--- memory the lockouts do not have.
local statisticNames

local function StatisticNames()
  if statisticNames then return statisticNames end
  statisticNames = {}
  if not (GetStatisticsCategoryList and GetCategoryNumAchievements and GetAchievementInfo) then return statisticNames end
  local ok, categories = pcall(GetStatisticsCategoryList)
  if not ok or type(categories) ~= "table" then return statisticNames end
  for _, categoryId in ipairs(categories) do
    local okCount, count = pcall(GetCategoryNumAchievements, categoryId)
    for index = 1, (okCount and count or 0) do
      local okInfo, id, name = pcall(GetAchievementInfo, categoryId, index)
      if okInfo and id and name then table.insert(statisticNames, { id = id, name = name }) end
    end
  end
  return statisticNames
end

--- The names a difficulty goes by, as the statistics may spell it in
--- their brackets: the client's difficulty name and the global strings of
--- the raid menu. The client calls 17 "Looking For Raid", the statistics
--- "Raid Finder".
local DIFFICULTY_STRINGS = {
  [17] = { "PLAYER_DIFFICULTY3", "RAID_FINDER" },
  [14] = { "PLAYER_DIFFICULTY1" },
  [15] = { "PLAYER_DIFFICULTY2" },
  [16] = { "PLAYER_DIFFICULTY6" },
}

local function DifficultyNames(difficultyId)
  local names = {}
  if GetDifficultyInfo then
    local ok, name = pcall(GetDifficultyInfo, difficultyId)
    if ok and type(name) == "string" and name ~= "" then table.insert(names, name) end
  end
  for _, global in ipairs(DIFFICULTY_STRINGS[difficultyId] or {}) do
    local value = _G[global]
    if type(value) == "string" and value ~= "" then table.insert(names, value) end
  end
  return names
end

--- The kills of one boss by difficulty out of the statistics: the entries
--- naming the boss, sorted by the difficulty named beside it. Nil where no
--- statistic names the boss at all.
local function StatisticKills(bossName)
  local matches = {}
  for _, stat in ipairs(StatisticNames()) do
    if stat.name:find(bossName, 1, true) then table.insert(matches, stat) end
  end
  if #matches == 0 then return nil end
  local kills, taken = {}, {}
  local function count(stat, difficultyId)
    taken[stat] = true
    local ok, value = pcall(GetStatistic, stat.id)
    local n = ok and tonumber(value) or 0
    if n > 0 then kills[tostring(difficultyId)] = n end
  end
  -- The named difficulties first, the harder ones before LFR: "Heroic" is
  -- not inside "Raid Finder", but a name could be inside another.
  for _, difficultyId in ipairs({ 16, 15, 14, 17 }) do
    for _, difficultyName in ipairs(DifficultyNames(difficultyId)) do
      for _, stat in ipairs(matches) do
        if not taken[stat] and stat.name:find(difficultyName, 1, true) then count(stat, difficultyId) end
      end
    end
  end
  -- One entry left that no difficulty named: the LFR one, spelled a way this addon does not know.
  if not kills["17"] then
    local left = {}
    for _, stat in ipairs(matches) do
      if not taken[stat] then table.insert(left, stat) end
    end
    if #left == 1 then count(left[1], 17) end
  end
  return kills
end

--- A boss went down: one more kill of that encounter on that difficulty on
--- the character's tally. The tally is the fallback where the statistics
--- do not name a boss; it lives on the entry across saves.
local function RecordKill(entry, encounterId, difficultyId)
  if type(encounterId) ~= "number" or type(difficultyId) ~= "number" then return end
  entry.raidKills = entry.raidKills or {}
  local byDifficulty = entry.raidKills[tostring(encounterId)] or {}
  byDifficulty[tostring(difficultyId)] = (byDifficulty[tostring(difficultyId)] or 0) + 1
  entry.raidKills[tostring(encounterId)] = byDifficulty
end

--- The season's raids with the kills on every boss by difficulty. The raids
--- come from the journal, narrowed to the ones the vault counts, or from the
--- week's lockouts where the journal is silent; the kills from the client's statistics, or from the tally where
--- no statistic names the boss; a boss the week's lockouts show as down
--- counts at least once either way.
local function CollectRaidProgress(entry, lockouts)
  local raids = JournalRaids(entry)
  local seasonal = false
  if raids then raids, seasonal = SeasonRaids(raids) else raids = LockoutRaids(lockouts) end
  if #raids == 0 then return nil end

  -- The week's lockouts seed the tally: a boss down this week was killed at least once.
  local tally = entry.raidKills or {}
  local seeded = {}
  for _, lock in ipairs(lockouts or {}) do
    if lock.isRaid and lock.difficultyId then
      for _, killedName in ipairs(lock.bosses or {}) do
        seeded[lock.name .. "|" .. killedName .. "|" .. tostring(lock.difficultyId)] = true
      end
    end
  end

  local fromStatistics = 0
  for _, raid in ipairs(raids) do
    for _, boss in ipairs(raid.bosses) do
      local kills = StatisticKills(boss.name)
      if kills then
        fromStatistics = fromStatistics + 1
      else
        kills = {}
        local counted = boss.id and tally[tostring(boss.id)] or {}
        for difficulty, count in pairs(counted) do kills[difficulty] = count end
      end
      for _, difficultyId in ipairs(RAID_DIFFICULTIES) do
        local key = tostring(difficultyId)
        if seeded[raid.name .. "|" .. boss.name .. "|" .. key] and (kills[key] or 0) < 1 then kills[key] = 1 end
      end
      boss.kills = kills
    end
  end
  entry.raidKills = tally
  entry.raidProgressNote = ("%s raids %d, statistics for %d bosses"):format(seasonal and "season" or "tier", #raids, fromStatistics)
  return raids
end

---------------------------------------------------------------------------
-- Quests
---------------------------------------------------------------------------

--- The register of quests: every quest any character had on its log, with
--- what the client says about it. Account-wide and never pruned, so the app
--- can tell a season weekly a week after anyone last did it. The client's
--- names for frequency and classification are written, not their numbers.
local function RegisterQuest(info)
  local quests = WarbandBriefingDB.quests
  if not quests then return end
  local id = info.questID
  local record = quests[tostring(id)] or {}
  -- A hidden tracking quest has no title on the log; keep one seen before.
  if not info.isHidden and info.title and info.title ~= "" then record.title = info.title end
  record.hidden = info.isHidden or nil
  record.frequency = EnumName(Enum and Enum.QuestFrequency, info.frequency or 0)
  if C_QuestInfoSystem and C_QuestInfoSystem.GetQuestClassification then
    local ok, classification = pcall(C_QuestInfoSystem.GetQuestClassification, id)
    if ok then record.classification = EnumName(Enum and Enum.QuestClassification, classification) end
  end
  if GetQuestExpansion then
    local ok, expansion = pcall(GetQuestExpansion, id)
    if ok and type(expansion) == "number" then record.expansion = expansion end
  end
  if C_QuestLog.GetQuestTagInfo then
    local ok, tag = pcall(C_QuestLog.GetQuestTagInfo, id)
    -- The tag names the profession a quest is for; the app binds it without
    -- reading the title.
    if ok and tag then record.tradeskill = tag.tradeskillLineID or nil end
  end
  if C_QuestLog.IsAccountQuest then
    local ok, account = pcall(C_QuestLog.IsAccountQuest, id)
    if ok then record.account = account or nil end
  end
  record.seenAt = GetServerTime()
  quests[tostring(id)] = record
end

--- The frequency of every quest seen on the log, so a turn-in - by then
--- gone from the log - can still be told weekly from not.
local frequencies = {}

--- The quest log, so the app knows a quest that is on the way: accepted,
--- how far, ready to turn in - with the frequency the client gives it, so
--- the app can tell a weekly from a level quest. Hidden tracking quests are
--- left out. Which quests are the week's is the app's question: its own
--- list can hold a quest the client does not flag weekly, the way
--- SavedInstances keeps exceptions over the flag.
local function CollectQuestLog()
  if not C_QuestLog or not C_QuestLog.GetNumQuestLogEntries then return nil end
  local out = {}
  local count = C_QuestLog.GetNumQuestLogEntries()
  for i = 1, count do
    local info = C_QuestLog.GetInfo(i)
    if info and not info.isHeader and info.questID and info.questID > 0 then
      frequencies[info.questID] = info.isHidden and -1 or (info.frequency or 0)
      RegisterQuest(info)
    end
    if info and not info.isHeader and info.questID and info.questID > 0 and not info.isHidden then
      local fulfilled, required = 0, 0
      local objectives = C_QuestLog.GetQuestObjectives and C_QuestLog.GetQuestObjectives(info.questID) or nil
      for _, objective in ipairs(objectives or {}) do
        -- A progress bar objective counts in percent; a counter in units.
        -- Both add up to one figure the app can show beside the quest.
        if objective.type == "progressbar" then
          fulfilled = fulfilled + (objective.numFulfilled or 0)
          required = required + 100
        elseif (objective.numRequired or 0) > 0 then
          fulfilled = fulfilled + (objective.numFulfilled or 0)
          required = required + objective.numRequired
        elseif objective.finished then
          fulfilled = fulfilled + 1
          required = required + 1
        else
          required = required + 1
        end
      end
      local ready = C_QuestLog.ReadyForTurnIn and C_QuestLog.ReadyForTurnIn(info.questID)
      if ready == nil and C_QuestLog.IsComplete then ready = C_QuestLog.IsComplete(info.questID) end
      table.insert(out, {
        id = info.questID,
        title = info.title,
        ready = ready and true or false,
        fulfilled = fulfilled,
        required = required,
        frequency = info.frequency,
      })
    end
  end
  return out
end

--- Which of the registered quests this character has completed, as the
--- client flags them - a turn-in the addon was not there to see included.
--- Across a weekly reset the two lists teach the register: a quest flagged
--- before the reset and clear after it comes back every week, whatever the
--- client had said about its frequency. A daily is left alone; it clears
--- every day and would pass for a weekly by chance.
local function CollectFlagged(entry)
  if not (C_QuestLog and C_QuestLog.IsQuestFlaggedCompleted) then return end
  local quests = WarbandBriefingDB.quests or {}
  local flagged = {}
  for id in pairs(quests) do
    local numeric = tonumber(id)
    if numeric then
      local ok, done = pcall(C_QuestLog.IsQuestFlaggedCompleted, numeric)
      if ok and done then flagged[id] = true end
    end
  end
  -- The reset stamp drifts by a second between saves; an hour tells a new
  -- week from the same one.
  local week = entry.nextResetAt
  if entry.questsFlagged and entry.flaggedWeek and week and week - entry.flaggedWeek > 3600 then
    for id in pairs(entry.questsFlagged) do
      local record = quests[id]
      if record and not flagged[id] and record.frequency ~= "Daily" then record.resets = "weekly" end
    end
  end
  entry.questsFlagged = flagged
  entry.flaggedWeek = week
end

--- The quests turned in since the last weekly reset, so the app can tick a
--- weekly the log no longer has. Kept until the reset has passed.
local function RecordTurnedIn(entry, questId)
  -- Only a quest the log had shown: a hidden tracking quest never was.
  local frequency = frequencies[questId]
  if frequency == nil or frequency < 0 then return end
  local title = C_QuestLog and C_QuestLog.GetTitleForQuestID and C_QuestLog.GetTitleForQuestID(questId) or nil
  entry.questsDone = entry.questsDone or {}
  entry.questsDone[tostring(questId)] = { title = title, at = GetServerTime(), frequency = frequency }
  -- The register notes the turn-in too: a quest somebody finishes is one
  -- worth a line, and the stamp says how recent that is.
  local record = WarbandBriefingDB.quests and WarbandBriefingDB.quests[tostring(questId)]
  if record then record.doneAt = GetServerTime() end
end

--- Drops turned-in quests from before the reset the character is on.
local function PruneTurnedIn(entry)
  if not entry.questsDone then return end
  local resetAt = entry.nextResetAt and (entry.nextResetAt - 7 * 86400) or nil
  if not resetAt then return end
  for id, record in pairs(entry.questsDone) do
    if (record.at or 0) < resetAt then entry.questsDone[id] = nil end
  end
end

---------------------------------------------------------------------------
-- Currencies, item level and gold
---------------------------------------------------------------------------

--- Visible currencies with an amount, weekly caps included where there is one.
local function CollectCurrencies()
  if not C_CurrencyInfo or not C_CurrencyInfo.GetCurrencyListSize then return nil end
  local out = {}
  local size = C_CurrencyInfo.GetCurrencyListSize() or 0
  for i = 1, size do
    local ok, info = pcall(C_CurrencyInfo.GetCurrencyListInfo, i)
    local id
    if ok and info and not info.isHeader then
      local ok2, link = pcall(C_CurrencyInfo.GetCurrencyListLink, i)
      if ok2 and link then id = tonumber(link:match("currency:(%d+)")) end
      -- The icon of a currency nobody holds yet is still the icon the
      -- settings list it under.
      RegisterIcon("currencies", id, info.iconFileID)
    end
    if ok and info and not info.isHeader then
      local entry = {
        id       = id,
        name     = info.name,
        quantity = info.quantity or 0,
        max      = (info.maxQuantity and info.maxQuantity > 0) and info.maxQuantity or nil,
      }

      -- Weekly caps (crests and the like) are only in the detailed query.
      if id and C_CurrencyInfo.GetCurrencyInfo then
        local ok3, detail = pcall(C_CurrencyInfo.GetCurrencyInfo, id)
        if ok3 and detail and detail.useTotalEarnedForMaxQty then
          entry.earnedThisWeek = detail.totalEarned
          entry.weeklyMax = detail.maxQuantity
        elseif ok3 and detail and detail.canEarnPerWeek then
          entry.earnedThisWeek = detail.quantityEarnedThisWeek
          entry.weeklyMax = detail.maxWeeklyQuantity
        end
      end

      -- A currency with none in the bag is still the week's when some of it
      -- was earned this week: the Voidcores are bought and spent in one
      -- session, and what stays is the two of the week.
      if entry.quantity > 0 or (entry.earnedThisWeek or 0) > 0 then
        table.insert(out, entry)
      end
    end
  end
  return out
end

local function CollectItemLevel()
  local overall, equipped = GetAverageItemLevel()
  return equipped or overall
end

--- The gold in the warband bank. The client keeps the figure between
--- visits - the money frame's tooltip shows it anywhere - so it is read at
--- every save, not only at the bank.
local function CollectWarbandGold()
  if not (C_Bank and C_Bank.FetchDepositedMoney and Enum and Enum.BankType) then return nil end
  local money = C_Bank.FetchDepositedMoney(Enum.BankType.Account)
  return type(money) == "number" and money or nil
end

---------------------------------------------------------------------------
-- Saving
---------------------------------------------------------------------------

--- Whether the client can describe the character at all right now.
---
--- It cannot during a load screen or while logging out: item level and money
--- come back as 0, the saved-instance list is empty and the vault reports a
--- week with nothing in it - none of which is distinguishable from the real
--- thing. A save at such a moment does not add anything, it destroys what an
--- earlier one got right, so it is skipped.
local function CanDescribeCharacter()
  if not UnitExists("player") or (UnitLevel("player") or 0) <= 0 then return false end
  local ilvl = CollectItemLevel()
  return type(ilvl) == "number" and ilvl > 0
end

local function CharacterKey(name, realmSlug)
  return string.format("%s-%s", name, realmSlug)
end

--- The items of the banks as they were last read, registered again: a
--- bank read before the register knew a kind of thing (the class code,
--- the icon) would leave the app without it until the next visit to the
--- bank. The client answers for an id it has in its cache without a
--- round trip, and an item the account owns is in it.
local function RegisterKnownItems()
  local lists = {}
  local warband = WarbandBriefingDB.warbandBank
  if warband and type(warband.tabs) == "table" then lists[#lists + 1] = warband.tabs end
  local name, realm = UnitName("player"), GetRealmName()
  if name and realm then
    local entry = (WarbandBriefingDB.chars or {})[CharacterKey(name, Slugify(realm))]
    if entry and entry.bank and type(entry.bank.tabs) == "table" then lists[#lists + 1] = entry.bank.tabs end
  end
  for _, tabs in ipairs(lists) do
    for _, tab in ipairs(tabs) do
      for _, item in ipairs(tab.items or {}) do
        if item.id then
          RegisterItemClass(item.id)
          if C_Item and C_Item.GetItemIconByID then
            local ok, icon = pcall(C_Item.GetItemIconByID, item.id)
            if ok then RegisterIcon("items", item.id, icon) end
          end
        end
      end
    end
  end
end

--- Runs one collector on its own: a collector that fails leaves the others
--- alone, and its message goes on the entry (`errors[name]`), where the app
--- and a look at the file find it. Nil for the value when it failed.
local function Guard(entry, name, collect, ...)
  local ok, value = pcall(collect, ...)
  if ok then
    if entry.errors then entry.errors[name] = nil end
    return value
  end
  entry.errors = entry.errors or {}
  entry.errors[name] = tostring(value)
  return nil
end

function WarbandBriefing:Save(reason)
  local name = UnitName("player")
  local realm = GetRealmName()
  if not name or not realm then return end
  if not CanDescribeCharacter() then return end

  local realmSlug = Slugify(realm)
  local classLocalized, classFile = UnitClass("player")
  local specName
  local specIndex = GetSpecialization and GetSpecialization()
  if specIndex then
    local _, sn = GetSpecializationInfo(specIndex)
    specName = sn
  end

  WarbandBriefingDB.version = DB_VERSION
  WarbandBriefingDB.chars = WarbandBriefingDB.chars or {}
  WarbandBriefingDB.quests = WarbandBriefingDB.quests or {}
  WarbandBriefingDB.icons = WarbandBriefingDB.icons or {}
  WarbandBriefingDB.tooltips = WarbandBriefingDB.tooltips or { items = {} }
  -- The expansion the client is on, so the app can keep the register's
  -- current-season quests apart from the ones of the last one.
  WarbandBriefingDB.expansion = LE_EXPANSION_LEVEL_CURRENT or (GetExpansionLevel and GetExpansionLevel()) or nil

  local entry = WarbandBriefingDB.chars[CharacterKey(name, realmSlug)] or {}

  entry.name           = name
  entry.realm          = realm
  entry.realmSlug      = realmSlug
  entry.region         = GetCurrentRegionName and GetCurrentRegionName() or nil
  -- The character's id is the tail of the GUID; Blizzard's image host renders the portrait by it.
  entry.guid           = UnitGUID and UnitGUID("player") or nil
  entry.class          = classFile
  entry.classLocalized = classLocalized
  entry.spec           = specName
  entry.level          = UnitLevel("player")
  entry.faction        = UnitFactionGroup("player")
  -- Nil while unguilded, which also clears the name after leaving one.
  entry.guild          = GetGuildInfo("player")
  entry.ilvl           = Guard(entry, "ilvl", CollectItemLevel)
  entry.money          = GetMoney and GetMoney() or nil
  entry.updatedAt      = GetServerTime()
  entry.savedBecause   = reason
  entry.zone           = GetRealZoneText and GetRealZoneText() or nil
  -- Written by a version that never read it back; gone with the next save.
  entry.quests         = nil

  -- Only a character still levelling has experience to report; at the cap the
  -- bar is gone and the numbers would say nothing.
  local cap = GetMaxLevelForPlayerExpansion and GetMaxLevelForPlayerExpansion() or nil
  if UnitXPMax("player") > 0 and (not cap or UnitLevel("player") < cap) then
    entry.xp = { xp = UnitXP("player"), xpMax = UnitXPMax("player"), rested = GetXPExhaustion() or 0 }
  else
    entry.xp = nil
  end

  -- The reset this realm actually runs on. Written every save, so the app can
  -- take the boundary from the client instead of a timezone rule of its own.
  local untilReset = C_DateAndTime and C_DateAndTime.GetSecondsUntilWeeklyReset
    and C_DateAndTime.GetSecondsUntilWeeklyReset() or nil
  entry.nextResetAt = untilReset and (entry.updatedAt + untilReset) or nil

  local vault = Guard(entry, "vault", CollectVault)
  if vault then entry.vault = vault end

  local available = Guard(entry, "vaultRewardWaiting", HasAvailableRewards)
  if available ~= nil then entry.vaultRewardWaiting = available end

  local runs = Guard(entry, "runs", CollectRuns)
  if runs then entry.runs = runs end

  local currencies = Guard(entry, "currencies", CollectCurrencies)
  if currencies then entry.currencies = currencies end

  local bests = Guard(entry, "dungeonBests", CollectDungeonBests)
  if bests then entry.dungeonBests = bests end

  entry.gear     = Guard(entry, "gear", CollectGear) or entry.gear
  entry.renown   = Guard(entry, "renown", CollectRenown) or entry.renown
  entry.reputations = Guard(entry, "reputations", CollectReputations) or entry.reputations
  local bags = Guard(entry, "bags", CollectBags)
  if bags then
    entry.bags = bags
    entry.bagSpace = { free = bags.free, total = bags.slots }
  end
  Guard(entry, "knownItems", RegisterKnownItems)
  entry.professions = Guard(entry, "professions", CollectProfessions) or entry.professions

  -- Account-wide, so it sits beside the characters rather than in each one.
  local warbandGold = Guard(entry, "warbandGold", CollectWarbandGold)
  if warbandGold then WarbandBriefingDB.warbandGold = { money = warbandGold, updatedAt = GetServerTime() } end
  local events = Guard(entry, "events", CollectEvents)
  if events then WarbandBriefingDB.events = { list = events, updatedAt = GetServerTime() } end
  local seasonDungeons = Guard(entry, "seasonDungeons", CollectSeasonDungeons)
  if seasonDungeons then WarbandBriefingDB.season = { dungeons = seasonDungeons, updatedAt = GetServerTime() } end

  entry.lockouts    = Guard(entry, "lockouts", CollectLockouts) or entry.lockouts
  entry.raidProgress = Guard(entry, "raidProgress", CollectRaidProgress, entry, entry.lockouts)
  entry.questLog    = Guard(entry, "questLog", CollectQuestLog) or entry.questLog
  Guard(entry, "flagged", CollectFlagged, entry)
  Guard(entry, "turnedIn", PruneTurnedIn, entry)
  entry.worldBosses = Guard(entry, "worldBosses", CollectWorldBosses) or entry.worldBosses

  if C_MythicPlus and C_MythicPlus.GetOwnedKeystoneChallengeMapID then
    local ok, mapId = pcall(C_MythicPlus.GetOwnedKeystoneChallengeMapID)
    if ok and mapId then
      entry.keystoneMapId = mapId
      entry.keystoneLevel = C_MythicPlus.GetOwnedKeystoneLevel and C_MythicPlus.GetOwnedKeystoneLevel() or nil
      if C_ChallengeMode and C_ChallengeMode.GetMapUIInfo then
        local ok2, mapName = pcall(C_ChallengeMode.GetMapUIInfo, mapId)
        if ok2 then entry.keystoneName = mapName end
      end
    else
      -- Nobody holds a key across the reset; an old one must not linger here.
      entry.keystoneMapId, entry.keystoneLevel, entry.keystoneName = nil, nil, nil
    end
  end

  if C_ChallengeMode and C_ChallengeMode.GetOverallDungeonScore then
    local ok, score = pcall(C_ChallengeMode.GetOverallDungeonScore)
    if ok then entry.mythicRating = score end
  end

  WarbandBriefingDB.chars[CharacterKey(name, realmSlug)] = entry
end

---------------------------------------------------------------------------
-- Open windows: bank, guild bank, auction house, mailbox
---------------------------------------------------------------------------

--- The entry of the character that is playing, made where it is missing:
--- what an event records between two saves goes on it, and the next save
--- keeps it.
local function CurrentEntry()
  local name, realm = UnitName("player"), GetRealmName()
  if not name or not realm then return nil end
  WarbandBriefingDB.chars = WarbandBriefingDB.chars or {}
  local key = CharacterKey(name, Slugify(realm))
  local entry = WarbandBriefingDB.chars[key] or {}
  WarbandBriefingDB.chars[key] = entry
  return entry
end

--- Whether the bank is open: the one time its tabs can be read.
local bankOpen = false

--- The bank of the character on its entry, the warband bank beside the
--- characters, each with the moment it was read: a deposit from another
--- character makes the older read stale, and the app can say how old the
--- picture is. Nothing is overwritten with nothing - a tab list the client
--- did not give keeps the last one.
local function CollectBank()
  if not bankOpen then return end
  local bankType = Enum and Enum.BankType
  if not bankType then return end
  local now = GetServerTime()
  local name, realm = UnitName("player"), GetRealmName()
  if name and realm then
    local tabs = CollectBankTabs(bankType.Character)
    if tabs then
      WarbandBriefingDB.chars = WarbandBriefingDB.chars or {}
      local key = CharacterKey(name, Slugify(realm))
      local entry = WarbandBriefingDB.chars[key] or {}
      entry.bank = { tabs = tabs, updatedAt = now }
      WarbandBriefingDB.chars[key] = entry
    end
  end
  local tabs = CollectBankTabs(bankType.Account)
  if tabs then WarbandBriefingDB.warbandBank = { tabs = tabs, updatedAt = now } end
end

--- Whether the guild bank is open: the client only says its gold then.
local guildBankOpen = false

--- The gold of the guild bank, under the guild's name and realm so two
--- characters of one guild write the same record. The figure is the last
--- visit's, as the bank's tabs are; a guild left keeps its last one.
local function CollectGuildBank()
  if not guildBankOpen or not GetGuildBankMoney then return end
  local guildName, _, _, guildRealm = GetGuildInfo("player")
  if not guildName then return end
  -- The client names the realm only where it is not the character's own.
  local realm = guildRealm or GetRealmName()
  WarbandBriefingDB.guilds = WarbandBriefingDB.guilds or {}
  WarbandBriefingDB.guilds[guildName .. "-" .. Slugify(realm)] = {
    name = guildName,
    realm = realm,
    money = GetGuildBankMoney(),
    updatedAt = GetServerTime()
  }
end

--- The most seconds an auction of an item has left, by the band the client
--- names; a commodity says its seconds outright.
local AUCTION_BAND_SECONDS = { [0] = 30 * 60, [1] = 2 * 3600, [2] = 12 * 3600, [3] = 48 * 3600 }

--- The character's auctions, counted, with the first to run out. The
--- client lists them once the auction house is open and asked; a sold one
--- waits for the mail and is no auction any more.
local function CollectAuctions(entry)
  if not (C_AuctionHouse and C_AuctionHouse.GetNumOwnedAuctions) then return end
  local active = Enum and Enum.AuctionStatus and Enum.AuctionStatus.Active or 0
  local now = GetServerTime()
  local count, nextExpiresAt = 0, nil
  for index = 1, C_AuctionHouse.GetNumOwnedAuctions() do
    local info = C_AuctionHouse.GetOwnedAuctionInfo(index)
    if info and (info.status == nil or info.status == active) then
      count = count + 1
      local left = info.timeLeftSeconds or (info.timeLeft and AUCTION_BAND_SECONDS[info.timeLeft])
      if left and (not nextExpiresAt or now + left < nextExpiresAt) then nextExpiresAt = now + left end
    end
  end
  entry.auctions = { count = count, nextExpiresAt = nextExpiresAt, updatedAt = now }
end

--- Whether the mailbox is open: the inbox is only counted then.
local mailOpen = false

--- The mailbox's messages, counted: the client's second figure is the
--- whole inbox, the first only the page it shows.
local function CollectMail(entry)
  if not mailOpen or not GetInboxNumItems then return end
  local _, total = GetInboxNumItems()
  entry.mail = { count = total or 0, updatedAt = GetServerTime() }
end

---------------------------------------------------------------------------
-- Events
---------------------------------------------------------------------------

local frame = CreateFrame("Frame")
frame:RegisterEvent("ADDON_LOADED")
frame:RegisterEvent("PLAYER_ENTERING_WORLD")
frame:RegisterEvent("WEEKLY_REWARDS_UPDATE")
frame:RegisterEvent("CHALLENGE_MODE_COMPLETED")
frame:RegisterEvent("CHALLENGE_MODE_MAPS_UPDATE")
frame:RegisterEvent("UPDATE_INSTANCE_INFO")
frame:RegisterEvent("BOSS_KILL")
frame:RegisterEvent("ENCOUNTER_END")
frame:RegisterEvent("CURRENCY_DISPLAY_UPDATE")
frame:RegisterEvent("PLAYER_EQUIPMENT_CHANGED")
frame:RegisterEvent("MAJOR_FACTION_RENOWN_LEVEL_CHANGED")
frame:RegisterEvent("PLAYER_LEVEL_UP")
frame:RegisterEvent("CALENDAR_UPDATE_EVENT_LIST")
frame:RegisterEvent("SKILL_LINES_CHANGED")
frame:RegisterEvent("PLAYER_GUILD_UPDATE")
frame:RegisterEvent("QUEST_TURNED_IN")
frame:RegisterEvent("QUEST_LOG_UPDATE")
frame:RegisterEvent("TRADE_SKILL_LIST_UPDATE")
frame:RegisterEvent("BANKFRAME_OPENED")
frame:RegisterEvent("BANKFRAME_CLOSED")
frame:RegisterEvent("BAG_UPDATE_DELAYED")
frame:RegisterEvent("ACCOUNT_MONEY")
frame:RegisterEvent("GUILDBANKFRAME_OPENED")
frame:RegisterEvent("GUILDBANKFRAME_CLOSED")
frame:RegisterEvent("GUILDBANK_UPDATE_MONEY")
frame:RegisterEvent("AUCTION_HOUSE_SHOW")
frame:RegisterEvent("AUCTION_HOUSE_AUCTION_CREATED")
frame:RegisterEvent("AUCTION_CANCELED")
frame:RegisterEvent("OWNED_AUCTIONS_UPDATED")
frame:RegisterEvent("MAIL_SHOW")
frame:RegisterEvent("MAIL_CLOSED")
frame:RegisterEvent("MAIL_INBOX_UPDATE")

local pending = false

--- Collects in one go, so an event storm does not scan a dozen times over.
local function ScheduleSave(reason)
  if pending then return end
  pending = true
  C_Timer.After(3, function()
    pending = false
    WarbandBriefing:Save(reason)
  end)
end

frame:SetScript("OnEvent", function(_, event, arg1, arg2, arg3, arg4, arg5)
  if event == "ADDON_LOADED" and arg1 == ADDON_NAME then
    WarbandBriefingDB.version = DB_VERSION
    WarbandBriefingDB.chars = WarbandBriefingDB.chars or {}
    WarbandBriefingDB.quests = WarbandBriefingDB.quests or {}
    WarbandBriefingDB.icons = WarbandBriefingDB.icons or {}
    WarbandBriefingDB.tooltips = WarbandBriefingDB.tooltips or { items = {} }
    -- Earlier versions recorded the week's affixes; nothing reads them now.
    WarbandBriefingDB.affixes = nil
    return
  end

  if event == "PLAYER_ENTERING_WORLD" then
    -- Vault, M+ and lockout data are not loaded yet right after login.
    if C_MythicPlus then
      if C_MythicPlus.RequestMapInfo then pcall(C_MythicPlus.RequestMapInfo) end
      if C_MythicPlus.RequestRewards then pcall(C_MythicPlus.RequestRewards) end
    end
    if C_WeeklyRewards and C_WeeklyRewards.OnUIInteract then
      -- Asks the server for the vault activities and their rewards, which is
      -- what opening the vault window does. Without this the rewards are
      -- simply not in the client, and nothing can record them.
      pcall(C_WeeklyRewards.OnUIInteract)
    end
    RequestRaidInfo()
    -- The calendar is empty until asked; its answer arrives as
    -- CALENDAR_UPDATE_EVENT_LIST, which triggers a save of its own.
    if C_Calendar and C_Calendar.OpenCalendar then pcall(C_Calendar.OpenCalendar) end
    C_Timer.After(10, function() WarbandBriefing:Save("login") end)
    return
  end

  -- A quest turned in is gone from the log by the time the save runs, so it
  -- is written down here, on the character's own entry, as it happens.
  if event == "QUEST_TURNED_IN" and arg1 then
    local entry = CurrentEntry()
    if entry then RecordTurnedIn(entry, arg1) end
  end

  -- A boss fight ended. Only a win counts; the id and the difficulty are the
  -- client's (dungeon encounter id, difficulty id), the same the journal names.
  if event == "ENCOUNTER_END" and arg5 == 1 then
    local entry = CurrentEntry()
    if entry then RecordKill(entry, arg1, arg3) end
  end

  -- The profession window is open: the one moment the recipe cooldowns can
  -- be read. They go on the character's entry and stay across saves.
  if event == "TRADE_SKILL_LIST_UPDATE" then
    local entry = CurrentEntry()
    if entry then ScanCooldowns(entry) end
  end

  -- The guild bank's gold is readable between these two.
  if event == "GUILDBANKFRAME_OPENED" then
    guildBankOpen = true
    CollectGuildBank()
    return
  end
  if event == "GUILDBANKFRAME_CLOSED" then
    guildBankOpen = false
    return
  end
  if event == "GUILDBANK_UPDATE_MONEY" then
    CollectGuildBank()
    return
  end

  -- The auction house lists the character's auctions once asked; the
  -- answer comes as OWNED_AUCTIONS_UPDATED. Asked again after a sale is
  -- put up or taken down, so the count follows the visit.
  if event == "AUCTION_HOUSE_SHOW" or event == "AUCTION_HOUSE_AUCTION_CREATED" or event == "AUCTION_CANCELED" then
    if C_AuctionHouse and C_AuctionHouse.QueryOwnedAuctions then pcall(C_AuctionHouse.QueryOwnedAuctions, {}) end
    return
  end
  if event == "OWNED_AUCTIONS_UPDATED" then
    local entry = CurrentEntry()
    if entry then pcall(CollectAuctions, entry) end
    return
  end

  -- The inbox is counted at each change while the mailbox is open: a
  -- message taken out lowers the count before the mailbox closes.
  if event == "MAIL_SHOW" then
    mailOpen = true
    return
  end
  if event == "MAIL_CLOSED" then
    mailOpen = false
    return
  end
  if event == "MAIL_INBOX_UPDATE" then
    local entry = CurrentEntry()
    if entry then CollectMail(entry) end
    return
  end

  -- The bank is readable between these two; each change of a bag while it
  -- is open is a deposit or a withdrawal, and the picture follows it.
  if event == "BANKFRAME_OPENED" then
    bankOpen = true
    CollectBank()
    return
  end
  if event == "BANKFRAME_CLOSED" then
    bankOpen = false
    return
  end
  if event == "BAG_UPDATE_DELAYED" then
    if bankOpen then CollectBank() end
    return
  end

  -- Deliberately nothing on PLAYER_LOGOUT: the client writes SavedVariables
  -- for us when the session ends, so all this addon has to do is keep its
  -- table right while the character is actually loaded. Collecting at logout
  -- reads zeroes back out of the client and writes them over good data.
  ScheduleSave(event:lower())
end)

---------------------------------------------------------------------------
-- Slash command
---------------------------------------------------------------------------

SLASH_WARBANDBRIEFING1 = "/wbb"
SLASH_WARBANDBRIEFING2 = "/warbandbriefing"
SlashCmdList["WARBANDBRIEFING"] = function(msg)
  msg = (msg or ""):lower():gsub("^%s+", "")

  if msg == "save" then
    RequestRaidInfo()
    WarbandBriefing:Save("manual")
    print("|cff58a6ffWarband Briefing|r: collected. Logging out or /reload writes it to disk.")
    return
  end

  WarbandBriefing:Save("status")
  local count = 0
  for _ in pairs(WarbandBriefingDB.chars or {}) do count = count + 1 end
  print(("|cff58a6ffWarband Briefing|r: %d character(s) in the database."):format(count))

  local entry = (WarbandBriefingDB.chars or {})[CharacterKey(UnitName("player"), Slugify(GetRealmName()))]
  if entry and entry.vault then
    local labels = { raid = "Raid", mythicPlus = "Dungeon", world = "World" }
    for _, category in ipairs({ "raid", "mythicPlus", "world" }) do
      local slots = entry.vault[category] or {}
      local unlocked, best = 0, nil
      for _, slot in ipairs(slots) do
        if slot.unlocked then
          unlocked = unlocked + 1
          if slot.rewardIlvl and (not best or slot.rewardIlvl > best) then best = slot.rewardIlvl end
        end
      end
      print(("  %s: %d/3%s"):format(labels[category], unlocked, best and (" - item level %d"):format(best) or ""))
    end
  end
  print("|cff58a6ffWarband Briefing|r: SavedVariables are written on logout or /reload.")
end
