function GetPluginSettings()
{
	return {
		"name":			"Duel",					
		"id":			"JyoDuel",				
		"version":		"0.1",		
		"description":	"Jyoru Games duel battle simulator.",
		"author":		"Joey Albert Abano",
		"help url":		"https://github.com/joeyapa/Js-Duel-Simulator",
		"category":		"Jyoru Games",			
		"type":			"object",		
		"rotatable":	true,					
		"flags":		pf_singleglobal		
	};
};

////////////////////////////////////////
// Conditions

AddStringParam("Duel tag", "Enter duel tag.", "\"Duel\"");
AddCondition(0, cf_trigger, "On duel finished.", "Battle Result", "On duel {0} finished.", "Triggers when target duel is finished.", "DuelOnFinish");

AddStringParam("Duel tag", "Enter duel tag.", "\"Duel\"");
AddCondition(1, cf_looping, "For each battle result.", "Battle Result", "For each duel {0}, battle result.", "Loop on each battle results.", "EachBattle");

AddStringParam("Duel tag", "Enter duel tag.", "\"Duel\"");
AddCondition(0, cf_trigger, "On duel failed.", "Battle Result", "On duel {0} failed.", "Triggers when target duel failed.", "DuelOnFail");

////////////////////////////////////////
// Actions

AddStringParam("Duel tag", "Enter duel tag.", "\"Duel\"");
AddStringParam("Attacker", "Enter attackers' id.","");
AddStringParam("Defender", "Enter defenders' id.","");
AddAction(0, af_none, "Perform", "Battle", "Perform {0} duel, {1} vs. {2}.", "Performs duel simulatations between attacker and defender.", "PerformDuel");

AddStringParam("Duel tag", "Enter duel tag.", "\"Duel\"");
AddAction(1, af_none, "Clear", "Battle", "Clear {0} duel.", "Clear the duel information based on tag name.", "ClearDuel");

AddStringParam("Json", "Enter the character avatar definition in json formatted string", "");
AddAction(2, af_none, "Create or Update Avatar", "Avatar", "Create or update avatar.", "Create or update an avatar. ", "SaveUpdateAvatar");

AddStringParam("Avatar Id", "Enter the character avatar id");
AddAction(3, af_none, "Remove Avatar", "Avatar", "Remove avatar by on id.", "Add a jyoru games avatar formatted definition in json format. ", "RemoveAvatar");


////////////////////////////////////////
// Expressions

AddExpression(0, ef_return_string, "Duel battle damage", "Battle", "BattleDamage", "Return the damage value in this battle.");

AddStringParam("Attribute", "Enter attribute field id,hp,mhp,rhp,sp,msp,rsp,exp,atk,def,hit,eva");
AddExpression(1, ef_return_string, "Duel battle attacker", "Battle", "BattleAttacker", "Return the battle attacker attribute.");

AddStringParam("Attribute", "Enter attribute field id,hp,mhp,rhp,sp,msp,rsp,exp,atk,def,hit,eva");
AddExpression(2, ef_return_string, "Duel battle defender", "Battle", "BattleDefender", "Return the battle defender attribute.");

AddStringParam("Attribute", "Enter attribute field id,hp,mhp,sp:,atk,def,hit,eva,cd,cdc,cc,trn,tre,bk,bka,use,typ");
AddExpression(3, ef_return_string, "Duel battle skill", "Battle", "BattleSkill", "Return the skill attribute used by the attacker.");

AddExpression(4, ef_return_string, "Duel battle narrative result", "Battle", "NarrativeResult", "Return the narrative value.");

AddStringParam("Key", "Enter duel tag.");
AddExpression(5, ef_return_number, "Duel total battle counts", "Battle", "BattleCount", "Returns the total battle count.");

AddExpression(6, ef_return_number, "Current battle loop index", "Battle", "BattleLoopIndex", "Returns the current battle index.");

AddNumberParam("Index", "Enter narrative index.");
AddExpression(7, ef_return_string, "Duel battle narrative result by index", "Battle", "NarrativeResultByIndex", "Return the narrative value based on index.");


////////////////////////////////////////
ACESDone();

////////////////////////////////////////
// Array of property grid properties for this plugin

var property_list = [
	new cr.Property(ept_float, 	"Evasion Factor",		1.125,	"Defines the exponential difference in increase of evasion."),
	new cr.Property(ept_float, 	"Evasion Inherent",		0.5,	"The default percentage of evasion, if stats of evasion is equal to hit."),
	new cr.Property(ept_integer,"Battle Timeout",		1000,	"The number of battle lines before a duel is considered a draw.")
	];
	
// Called by IDE when a new object type is to be created
function CreateIDEObjectType()
{
	return new IDEObjectType();
}

// Class representing an object type in the IDE
function IDEObjectType()
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
}

// Called by IDE when a new object instance of this type is to be created
IDEObjectType.prototype.CreateInstance = function(instance)
{
	return new IDEInstance(instance);
}

// Class representing an individual instance of an object in the IDE
function IDEInstance(instance, type)
{
	assert2(this instanceof arguments.callee, "Constructor called as a function");
	
	// Save the constructor parameters
	this.instance = instance;
	this.type = type;
	
	// Set the default property values from the property table
	this.properties = {};
	
	for (var i = 0; i < property_list.length; i++)
		this.properties[property_list[i].name] = property_list[i].initial_value;
		
}

// Called when inserted via Insert Object Dialog for the first time
IDEInstance.prototype.OnInserted = function()
{
}

// Called when double clicked in layout
IDEInstance.prototype.OnDoubleClicked = function()
{
}

// Called after a property has been changed in the properties bar
IDEInstance.prototype.OnPropertyChanged = function(property_name)
{
}

// For rendered objects to load fonts or textures
IDEInstance.prototype.OnRendererInit = function(renderer)
{
}

// Called to draw self in the editor if a layout object
IDEInstance.prototype.Draw = function(renderer)
{
}

// For rendered objects to release fonts or textures
IDEInstance.prototype.OnRendererReleased = function(renderer)
{
}
