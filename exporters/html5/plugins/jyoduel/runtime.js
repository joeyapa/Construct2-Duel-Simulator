"use strict";

assert2(cr, "cr namespace not created");
assert2(cr.plugins_, "cr.plugins_ not created");

cr.plugins_.JyoDuel = function(runtime)
{
	this.runtime = runtime;
};

(function ()
{
	var pluginProto = cr.plugins_.JyoDuel.prototype;
		
	pluginProto.Type = function(plugin)
	{
		this.plugin = plugin;
		this.runtime = plugin.runtime;
	};

	var typeProto = pluginProto.Type.prototype;

	typeProto.onCreate = function()
	{	
	};

	pluginProto.Instance = function(type)
	{
		this.type = type;
		this.runtime = type.runtime;
	};
	
	var instanceProto = pluginProto.Instance.prototype;

	instanceProto.onCreate = function()
	{
		this.dueltag = '';
		this.duelfailmsg = '';
		this.avatarlist = [];
		this.duellist = [];
		this.narrativelist = [];
		this.forX = [];
		this.forDepth = [];
	};
	
	instanceProto.onDestroy = function ()
	{
	};
	
	instanceProto.saveToJSON = function ()
	{
		var self = this;

		return {
			"dueltag":self.dueltag,
			"avatarlist":self.avatarlist,
			"duellist":self.duellist,
			"narrativelist":self.narrativelist
		};
	};
	
	instanceProto.loadFromJSON = function (o)
	{
		this.dueltag = o["dueltag"];
		this.avatarlist = o["avatarlist"];
		this.duellist = o["duellist"];
		this.narrativelist = o["narrativelist"];		
	};
		
	instanceProto.draw = function(ctx)
	{
	};
	
	instanceProto.drawGL = function (glw)
	{
	};
	
	instanceProto.getDebuggerValues = function (propsections)
	{
		propsections.push({
			"title": "My debugger section",
			"properties": []
		});
	};
	
	instanceProto.onDebugValueEdited = function (header, name, value)
	{
		if (name === "My property")
			this.myProperty = value;
	};

	//////////////////////////////////////
	// Conditions
	function Cnds() {};
	
	
	Cnds.prototype.DuelOnFinish = function (dueltag)
	{		
		return this.dueltag === dueltag;
	};

	Cnds.prototype.DuelOnFail = function (dueltag)
	{		
		return true;
	};


	instanceProto.doForEachTrigger = function (current_event)
	{
		this.runtime.pushCopySol(current_event.solModifiers);
		current_event.retrigger();
		this.runtime.popSol(current_event.solModifiers);
	};

	Cnds.prototype.EachBattle = function (dueltag)
	{
		self.dueltag = dueltag;
	
		var current_event = this.runtime.getCurrentEventStack().current_event;
		this.forDepth++;
		var forDepth = this.forDepth;
		
		if( this.duellist[dueltag] && this.duellist[dueltag].log.length>0 ) {

			if (forDepth === this.forX.length)
			{
				this.forX.push(0);
			}
			else
			{
				this.forX[forDepth] = 0;		
			}

			for (this.forX[forDepth] = 0; this.forX[forDepth] < this.duellist[dueltag].log.length; this.forX[forDepth]++)
			{
				this.doForEachTrigger(current_event);				
			}

			this.forDepth--;
		}

		return false;
	};
		
	pluginProto.cnds = new Cnds();
	
	//////////////////////////////////////
	// Actions
	function Acts() {};	
		
	Acts.prototype.PerformDuel = function (dueltag,attackerid,defenderid)
	{
		var self = this;
				
		var a = self.avatarlist[attackerid];
		
		var d = self.avatarlist[defenderid];

		var p = this.properties;
		
		self.dueltag = dueltag;

		if( typeof(a)==='undefined' || typeof(d)==='undefined' ) {
			self.duelfailmsg = 'Incorrect avatar id.';
			self.runtime.trigger(cr.plugins_.JyoDuel.prototype.cnds.DuelOnFail, self);
		}
		else {
			self.duellist[dueltag] = duel(a,d,p);
			self.narrativelist[dueltag] = narrative(this.duellist[dueltag]);
			self.runtime.trigger(cr.plugins_.JyoDuel.prototype.cnds.DuelOnFinish, self);
		}
		
	};

	Acts.prototype.ClearDuel = function (dueltag)
	{
		this.duellist[dueltag] = {};
		this.narrativelist[dueltag] = {};		
	};

	Acts.prototype.SaveUpdateAvatar = function (json_avatar)
	{
		var avatar = JSON.parse(json_avatar);
		this.avatarlist[avatar.id] = avatar;	
	};

	Acts.prototype.RemoveAvatar = function (avatar_id)
	{
		this.avatarlist[avatar_id] = undefined;	
	};

	function duel(a,d,p) 
	{		
		var EVA_FACTOR = typeof(p)!='undefined'?p[0]:1.125;
		var EVA_INHERENT = typeof(p)!='undefined'?p[1]:0.5;
		var CHAR_DEFAULT = {id:'anonymous',hp:10,mhp:10,rhp:0,sp:10,msp:1,rsp:1,exp:1,atk:1,def:1,hit:1,eva:1,skill:[],buff:[]}
		var BATTLE_TIMEOUT = typeof(p)!='undefined'?p[2]:1000;
		
		/* cd:cooldown in turns, cdc:cooldown counter, cc:chance in 100
		   trn:turns support effect, tre:turns effect for charges, bk:backslash multiplier, bka: backslash adder, 
		   use: allowed number of use,typ:a|s(attack|selfsupport)
		 */
		var SKILL_DEFAULT = {id:'Blunt',hp:0,mhp:0,sp:-1,atk:1,def:0,hit:0,eva:0,cd:0,cdc:0,cc:100,trn:0,tre:0,bk:1,bka:0,use:-1,typ:'a'}; 
		
		var l = []; // logs
		
		a = merge(clone(CHAR_DEFAULT),clone(a)); d = merge(clone(CHAR_DEFAULT),clone(d)); // clone attacker and defender

		l.push({ak:clone(a),df:clone(d),dmg:0,skill:{typ:0},debuff:[],info:''}); // initially log attacker and defender
		l.push({ak:clone(d),df:clone(a),dmg:0,skill:{typ:0},debuff:[],info:''}); // initially log attacker and defender
				
		ssort(a.skill); ssort(d.skill); // sort attacker and defender skill chance use

		lead(a,d,l); //initiative, passive skills

		a.mhp=a.hp; d.mhp=d.hp; // define max hp based on current hp
		
		a = Math.random()<0.5 ? [d, d = a][0] : a; // randomly identify first attacker
	
		// duel loop, continue battle until a character reach hp zero or below
		var BTC = 0;
		while(d.hp>0 && BTC<BATTLE_TIMEOUT) {
			a = [d, d = a][0]; // swap characters

			if(a.sp<a.msp){ a.sp=a.sp+a.rsp; continue; } // check sp with minimum sp requirement (msp), increase sp based on rate (rsp)

			a.hp = (a.hp+a.rhp)>a.mhp ? a.mhp : (a.hp+a.rhp); // hp regeneration rate (rhp). 

			var dg = 0;	// damage placeholder

			cooldownskill(a.skill); // skill cooldown

			var sk = a.skill.length>0 ?  getskill(a.skill,0,0) : clone(SKILL_DEFAULT); // identify skill. todo: create skill rule system.

			switch(sk.typ) {
				case 'a': // attack: atk,hit are temporary effect | hp,sp are permanent effect
					dg = battle(a,d,sk,dg); nzattr(a,sk,'hp',1,0);
					break;
				case 'v': // vamp-attack-hp: same as typ='a', except hp will take effect if hit is successful
					dg = battle(a,d,sk,dg);
					if(dg>0){ nzattr(a,sk,'hp',1,0); }
					break;
				case 'vd': // vamp-attack-drain-hp: same as typ='v', except hp will be based on damage
					dg = battle(a,d,sk,dg);
					if(dg>0){ sk.hp=dg; nzattr(a,sk,'hp',1,0); }
					break;
				case 'f': // one-time support, permanent
					attrall(a,sk,1,0);
					break;							
				case 's': // one-time support, with expiry and backslash: increase self attributes immediately expires on a given duration
					attrall(a,sk,1,0); a.buff.push(clone(sk));
					break;							
				case 'c': // continous support,permanent: support may increase incrementally for hp,atk,def,hit,eva
					a.buff.push(clone(sk));
					break;
				case 'p': // poison commulative effect: reduce fixed hp over time.
					dg = battle(a,d,sk,dg);
					if(dg>0){ d.buff.push(clone(sk)); }
					break;
				case 'e': // enemy effect
					dg = battle(a,d,sk,dg);
					if(dg>0){ attrall(d,sk,1,0); d.buff.push(clone(sk)); }
					break;
				case 'g': // support casting, permanent: support will only take effect after a duration. can still perform other skills.
					a.buff.push(clone(sk));
					break;
				case 'gs': // support casting, with expiry and backslash: similar to 'g' but with expiry will be converted to 's'. casting turn is equal to expiry
					a.buff.push(clone(sk));
					break;				
			}
			
			sk.use = sk.use>0 ? (sk.use-1) : sk.use; // skill that have fixed usage

			sk.cdc = sk.cdc+sk.cd; // skill cooldown 

			a.sp = a.sp+sk.sp; // reduce sp

			a.hp = a.hp>a.mhp ? a.mhp : a.hp; // ensure hp doesnt exceed max hp (mhp)

			var debuff = buff(a); // check expiring buff or illness
					
			l.push({ak:clone(a),df:clone(d),dmg:dg,skill:sk,debuff:debuff,info:''}); // add in log file
			
			BTC++; // battle timeout counter
		}

		function clone(c) { return JSON.parse(JSON.stringify(c)); }

		function merge(o1, o2) { for(var p in o2) { try { o1[p] = (o2[p].constructor==Object) ? merge(o1[p],o2[p]) : o2[p]; } catch(e) {  o1[p] = o2[p]; } } return o1; }

		function ssort(o){ o.sort(function(a,b){ if(a.cc<b.cc){ return -1; } else if(a.cc>b.cc) { return 1; } return 0; }); }

		function lead(a,d,l) { leadattr(a,d,l); a=[d,d=a][0]; leadattr(a,d,l); }
	
		function cooldownskill(skl){ for(var j=0;j<skl.length;j++){ skl[j].cdc = skl[j].cdc>0 ? skl[j].cdc-1 : 0; } }

		function mergeskill(s,n){ s[n]=merge(clone(SKILL_DEFAULT),s[n]); return s[n]; }

		function randskill(s,n){ n=(n>s.length-1?0:n); return Math.floor(Math.random()*100)<s[n].cc ? mergeskill(s,n) : randskill(s,n+1); }

		function getskill(s,n,e){ r = randskill(s,n); return (r.use!=0&&r.cdc<=0&&r.typ!='l')?r:((e>20)?clone(SKILL_DEFAULT):getskill(s,n,e+1)); }

		function attr(a,sk,n,m,d){ a[n] = a[n]+Math.ceil(sk[n]*m)+d; }

		function nzattr(a,sk,n,m,d){ a[n] = (a[n]+Math.ceil(sk[n]*m)+d)<0 ? 0 : (a[n]+Math.ceil(sk[n]*m)+d); }

		function attrall (a,sk,m,d){ var nz=['hp','atk','hit','eva']; for(var i=0;i<nz.length;i++) { nzattr(a,sk,nz[i],m,d); } attr(a,sk,'def',m,d); }

		function battle(a,d,sk,dg) {  
			var r = d.eva-a.hit-sk.hit; // evasion rate
			if( !(Math.random() < ( EVA_INHERENT + (r>0?1:-1) * Math.pow(Math.abs(r),EVA_FACTOR)/100)) ) {				
				dg = (sk.atk+a.atk-d.def)<1 ? 1 : (sk.atk+a.atk-d.def);
				d.hp = d.hp<dg ? 0 : (d.hp-dg);				
			}	
			return dg;
		}

		function leadattr(a,d,l) {
			for(var i=0;i<a.skill.length;i++){ 
				if(a.skill[i].typ=='l'){ 
					a.skill[i]=mergeskill(a.skill,i);
					attrall(a,a.skill[i],1,0); attr(a,a.skill[i],'sp',1,0); 
					l.push({ak:clone(a),df:clone(d),dmg:0,skill:a.skill[i],debuff:[],info:''}); // add in log file
				} 
			} 
		}

		function buff(a) {
			var bfl=[],debuff=[]; 

			for(var i=0; i<a.buff.length; i++){
				a.buff[i].trn--;
				skb = a.buff[i]; 

				if(skb.typ=='p'||skb.typ=='c') { debuff.push(clone(skb)); if(a.buff[i].trn<=0){ bfl.push(i); } } // every turn: log buff activity				
				else if(a.buff[i].trn<=0){ debuff.push(clone(skb)); bfl.push(i); } // end of turn: remove buff			
						
				if(skb.typ=='p') { nzattr(a,skb,'hp',1,0); } // poison commulative effect				 			 								 				
				if(skb.typ=='c') { attrall(a,skb,1,0); } // continous support, permanent				
				if(skb.typ=='s') { if(a.buff[i].trn<=0){ attrall(a,skb,-(skb.bk),skb.bka); } } // one-time support, with expiry and backslash				
				if(skb.typ=='g') { if(a.buff[i].trn<=0){ attrall(a,skb,1,0); } } // support casting, permanent				
				if(skb.typ=='gs') { if(a.buff[i].trn<=0){ attrall(a,skb,1,0); skb.trn=skb.tre; skb.typ='s'; a.buff.push(clone(skb)); } } // support casting, expiry					

				a.hp = a.hp>a.mhp ? a.mhp : a.hp; // ensure hp doesnt exceed max hp (mhp)			
			}
			for(var i=0; i<bfl.length; i++){ a.buff.splice(bfl.pop(), 1); }
			return debuff;
		}

		var istie = ( (a.hp<=0&&d.hp<=0) || (BTC>=BATTLE_TIMEOUT)) ? true: false; // tie is both are dead or battle is too long

		return {win:a,lose:d,tie:istie,log:l}; // return duel result
	}	

	/**
	 *  Readable narrative of the duel result.
	 *  This is a readable content generated from the duel result log. 
	 */
	function narrative(duel) {
		var lgn=[],lst=[],n=['hp','atk','def','hit','eva']; // default attributes
		
		var log = duel && duel.log ? duel.log : false; // check log 

		if(log==='undefined' || log.length<1) { return; } // ensure log is defined

		for(var i=0;i<log.length;i++) {
			var m='', a=log[i], hh=(a.dmg==0)?false:true; // message, attacker, check if hit			

			// skill logs
			switch(a.skill.typ) {
				case 0:
					m+=a.ak.id+' is preparing for battle.';
					break;
				case 'l':
					m+=a.ak.id+' powered up a'+(vw(a.skill.id)?'n ':' ')+skn(a)+sklist(a.skill,'status')+'.';
					break;
				case 'a': 
					m+=a.ak.id+' unleach a'+(vw(a.skill.id)?'n ':' ')+skn(a)+ (hh?('attack dealing '+a.dmg+' dmg.'):'attack but missed.');
					if(a.skill.hp>0) { m+=(hh?'and ':'but still ') + 'gains ' + a.skill.hp + ' hp.'; }
					if(a.skill.hp<0) { m+='consuming ones life for ' + Math.abs(a.skill.hp) + ' hp.'; }								
					break;
				case 'v': 
					m+=a.ak.id+' unleach a'+(vw(a.skill.id)?'n ':' ')+skn(a)+(hh?('attack dealing '+a.dmg+' dmg.'):'attack but missed.');
					if(a.skill.hp>0) { m+=(hh?('Gains '+a.skill.hp+' hp.'):'') }
					if(a.skill.hp<0) { m+='Consuming ones life for ' + Math.abs(a.skill.hp) + ' points.'; }								
					break;	
				case 'vd': 
					m+=a.ak.id+' unleach a'+(vw(a.skill.id)?'n ':' ')+skn(a)+(hh?('attack dealing '+a.dmg+' dmg.'):'attack but missed.');
					if(a.skill.hp>0) { m+=(hh?('Gains '+a.skill.hp+' hp.'):'') }
					if(a.skill.hp<0) { m+='Draining ones life for ' + Math.abs(a.skill.hp) + ' points.'; }								
					break;	
				case 'f':
					m+=a.ak.id+' powered up a'+(vw(a.skill.id)?'n ':' ')+skn(a)+sklist(a.skill,'status')+'.';
					break;					
				case 's':
					m+=a.ak.id+' powered up a'+(vw(a.skill.id)?'n ':' ')+skn(a)+sklist(a.skill,'status')+'.';
					break;
				case 'c':
					m+=a.ak.id+' activated'+skn(a)+sklist(a.skill,'status') +'.';
					break;
				case 'p':
					m+=a.ak.id+' unleach a'+(vw(a.skill.id)?'n ':' ')+skn(a)+ (hh?('attack dealing '+a.dmg+' dmg.'):' attack but missed.');
					break;
				case 'g':
					m+=a.ak.id+' self-casted'+skn(a)+',' + sklist(a.skill,'status') +'.';
					break;
				case 'gs':
					m+=a.ak.id+' self-casted charging skill'+skn(a)+','+sklist(a.skill,'status')+'.'; ;
					break;					
			}
			
			// group smiliar buff and effects
			grp(a.debuff); 

			// debuff log			
			if(a.debuff.length>0) {
				ssort(a.debuff);
				var ml='';
				for(var j=0;j<a.debuff.length;j++){  
					switch(a.debuff[j].typ) {
						case 's':
							ml+='skill['+a.debuff[j].id+'] has faded';
							break;
						case 'c':
							ml+=(ml==''?'':',also ')+'has '+skn(a.debuff[j])+sklist(a.debuff[j],'status effect');
							if(a.debuff[j].trn<=0){ ml+=' and has worn off'; }							
							break;							
						case 'p':
							pdg=a.debuff[j].hp;
							ml+=(ml==''?'':',also ')+'is poisoned['+a.debuff[j].id+'] '+(pdg>0?'gained':'reduced')+' hp by ' + Math.abs(pdg);
							if(a.debuff[j].trn<=0){
								ml+=', poison['+a.debuff[j].id+'] has been neutralized afterwards';
							}
							break;
						case 'g':
							ml+=(ml==''?'':',also ')+'completed casting '+a.debuff[j].id;
							break;
						case 'gs':
							ml+=(ml==''?'':',also ')+'completed casting '+a.debuff[j].id;
							break;							
					}										
				}
				m+=a.ak.id+' '+ml+'.';
			}

			lgn.push(cl(m));
			lst.push({atkr:a.ak,dfdr:a.df});

			if(i==log.length-1 && !duel.tie) { m=duel.win.id+' defeated '+duel.lose.id+'.'; lgn.push(cl(m)); lst.push({atkr:a.ak,dfdr:a.df}); }				
			else if(i==log.length-1 && duel.tie) { m+='Battle ended in a draw.'; lgn.push(cl(m)); lst.push({atkr:a.ak,dfdr:a.df}); }			
		}
		
		function u(s){ return s!==undefined?(' '+s+' '):''; }

		function vw(s) { return ['a','e','i','o','u'].indexOf(s.charAt(0).toLowerCase())!==-1; } // !important: indexOf doesnt work with IE7

		function ssort(o){ o.sort(function(a,b){ if(a.id<b.id){ return -1; } else if(a.id>b.id) { return 1; } return 0; }); }

		function skn(a){ return a.skill!==undefined ? ' ['+a.skill.id+'] ' : a.id; }

		function cl(m){ return m.replace(' ,',',').replace(/\./g,'. ').replace(/^\s+|\s+$/g,'').replace('  ',' '); }

		function ad(a,b){ return (typeof(a)==='number'&&typeof(b)==='number') ? (a+b) : a; }

		function sklist(sk,p,s){ 
			var a='',p=u(p),s=u(s); 
			for(var j=0;j<n.length;j++){ 
				var sd='';
				if(sk[n[j]]>0) { sd = (n[j]+':+'+sk[n[j]]+','); } 
				else if(sk[n[j]]<0) { sd = (n[j]+':'+sk[n[j]]+',');	 }
				else { sd = ''; }
				a=a+(sd); 
			} 
			return (a!='')?(p+a.slice(0,-1)+s):a;  
		}

		function addmerge(e, o) { 
			for(var p in o){ 
				try{ e[p]=(o[p].constructor==Object) ? addmerge(e[p],o[p]) : (ad(e[p],o[p])); }
				catch(e){ e[p]=ad(e[p],o[p]); }
			} 
			return e; 
		}	

		function grp(l){
			var bfl=[],dup=false;
			for(var j=0;j<l.length;j++){  				
				for(var k=j+1;k<l.length;k++){ // group same id and add attribute effect
					if(l[j].id==l[k].id){ addmerge(l[j],l[k]); l.splice(k,1); grp(l); return; }
				}
			}
		}

		return {narrate:lgn,stats:lst}; // return the narration and statistics
	}	

	
	pluginProto.acts = new Acts();
	
	//////////////////////////////////////
	// Expressions
	function Exps() {};
	
	Exps.prototype.BattleDamage = function (ret)		
	{
		var self = this;
		if (this.forDepth >= 0 && this.forDepth < this.forX.length && self.dueltag)
			ret.set_any( this.duellist[self.dueltag].log[this.forX[this.forDepth]].dmg );			
		else
			ret.set_any(0);
	};

	Exps.prototype.BattleAttacker = function (ret, key)		
	{
		var self = this;
		if (this.forDepth >= 0 && this.forDepth < this.forX.length && self.dueltag)
			ret.set_any( this.duellist[self.dueltag].log[this.forX[this.forDepth]].ak[key] );			
		else
			ret.set_any(0);
	};

	Exps.prototype.BattleDefender = function (ret, key)		
	{
		var self = this;
		if (this.forDepth >= 0 && this.forDepth < this.forX.length && self.dueltag)
			ret.set_any( this.duellist[self.dueltag].log[this.forX[this.forDepth]].df[key] );			
		else
			ret.set_any(0);
	};

	Exps.prototype.BattleSkill = function (ret, key)		
	{
		var self = this;
		if (this.forDepth >= 0 && this.forDepth < this.forX.length && self.dueltag)
			ret.set_any( this.duellist[self.dueltag].log[this.forX[this.forDepth]].skill[key] );			
		else
			ret.set_any(0);
	};

	Exps.prototype.NarrativeResult = function (ret)
	{
		var self = this;
		if (this.forDepth >= 0 && this.forDepth < this.forX.length && self.dueltag)
			ret.set_any( this.narrativelist[self.dueltag].narrate[this.forX[this.forDepth]] );			
		else
			ret.set_any(0);

	};

	Exps.prototype.BattleCount = function (ret, dueltag)
	{
		var d = this.duellist[dueltag];
		if(d && d.log && d.log.length>0)
			ret.set_int(d.log.length);	
		else 
			ret.set_int(0);
	};

	Exps.prototype.BattleLoopIndex = function (ret)
	{		
		ret.set_int(this.forX[this.forDepth]);
	};

	Exps.prototype.NarrativeResultByIndex = function (ret, index)
	{
		var self = this;
		if (this.forDepth >= 0 && this.forDepth < this.forX.length && self.dueltag)
			ret.set_any( this.narrativelist[self.dueltag].narrate[index] );
		else
			ret.set_any(0);
	};	

	pluginProto.exps = new Exps();

}());
