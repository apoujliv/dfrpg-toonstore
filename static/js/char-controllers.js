/*
 * Angular.js controllers for charsheet components
 */

var app = angular.module('charsheet');

/**********************************************
 * Panel Controllers
 **********************************************/

// handle general panel

app.controller('GeneralCtrl', ['$scope','rootModel', function($scope)
{
	$scope.editing = false;

	$scope.$on('is_dirty', function(){ $scope.dirty = true; });
	$scope.$on('is_clean', function(){ $scope.dirty = false; });
}]);


// handle aspects

app.controller('AspectCtrl', ['$scope','rootModel', function($scope)
{
	$scope.editing = false;

	$scope.dragOptions = {
		axis: 'y',
		cursor: 'move',
		handle: '.dragHandle'
	};

	$scope.addAspect = function(){
		console.log('Adding aspect');
		$scope.data.aspects.aspects.push( {name: '', description: ''} );
		$scope.$emit('is_dirty');
	};

	$scope.removeAspect = function(index){
		console.log('Removing aspect at ', index);
		$scope.data.aspects.aspects.splice(index,1);
		$scope.$emit('is_dirty');
	};

	$scope.parseAspect = function(raw){
		var tag = /^\[([^\]]+)\]\s*(.+)$/;
		var match = tag.exec(raw);
		if( match )
			return {'name': match[2], 'type': match[1].toLowerCase()};
		else
			return {'name': raw, 'type': null};
	};

	$scope.$on('is_dirty', function(){ $scope.dirty = true; });
	$scope.$on('is_clean', function(){ $scope.dirty = false; });
}]);


// skill block and dependencies
//
app.controller('SkillCtrl', ['$scope','SharedResources','$rootScope','rootModel', function($scope, SharedResources, $rootScope)
{
	$scope.editing = false;

	$scope.skills = SharedResources.skills;
	$scope.label = SharedResources.skillLabel;

	if( !$scope.data.skills.system )
		$scope.data.skills.system = 'columns';

	// correct ordering of skill groups
	$scope.presOrder = function(){
		var arr = [];
		for(var i=$scope.data.totals.skill_cap; i>=0; i--){
			arr.push(i);
		}
		return arr;
	};

	// skill ladder validator
	$scope.valid = function(){
		var valid = true;
		for( var i=1; i<$scope.data.totals.skill_cap; i++ ){
			if( $scope.data.skills.system === 'columns' )
				valid &= SharedResources.skills(i).length >= SharedResources.skills(i+1).length;
			else if( $scope.data.skills.system === 'pyramid' )
				valid &= ((SharedResources.skills(i).length > SharedResources.skills(i+1).length) || (SharedResources.skills(i).length === 0));
		}
		//return (valid ? 'Valid' : 'INVALID') + ', '+SharedResources.skillPointsAvailable()+' available';
		return (valid ? clientStrings.validSkills : clientStrings.invalidSkills).replace('%s', SharedResources.skillPointsAvailable());
	};


	// add new skill
	$scope.addSkill = function(skillName)
	{
		var allSkills = [];
		if( $scope.fields.shifted )
			allSkills = $scope.data.skills.shifted_lists.reduce(function(sum,cur){ return sum.concat(cur); }, []);
		else
			allSkills = $scope.data.skills.lists.reduce(function(sum,cur){ return sum.concat(cur); }, []);
		allSkills = allSkills.map(function(x){ return x.toUpperCase(); });
	
		if( allSkills.indexOf( skillName.toUpperCase() ) === -1 ){
			$scope.skills(0).push(skillName);
			$scope.skills(0).sort();
			$scope.$emit('is_dirty');
		}
		else {
			alert('Duplicate skill');
		}
	};

	$scope.addSkillSet = function(set)
	{
		var sets = {
			'fae': 'Careful Clever Flashy Forceful Quick Sneaky'.split(' '),
			'dfrpg': 'Alertness Athletics Burglary Contacts Conviction Craftsmanship Deceit Discipline Driving Empathy Endurance Fists Guns Intimidation Investigation Lore Might Performance Presence Rapport Resources Scholarship Stealth Survival Weapons'.split(' '),
			'core': 'Athletics Burglary Contacts Crafts Deceive Drive Empathy Fight Investigate Lore Notice Physique Provoke Rapport Resources Shoot Stealth Will'.split(' ')
		};

		if( sets[set] ){
			$scope.data.skills.lists[0] = sets[set];
			$scope.data.skills.shifted_lists[0] = sets[set];
			$scope.$emit('is_dirty');
		}
	};

	$scope.noSkills = function(){
		return $scope.data.skills.lists.reduce(function(sum,cur){ return sum+cur.length; },0)
			+ $scope.data.skills.shifted_lists.reduce(function(sum,cur){ return sum+cur.length; },0)
			=== 0;
	};

	$scope.copySkillsToShifted = function()
	{
		$scope.data.skills.shifted_lists = [[],[],[],[],[],[],[],[],[]];

		for(var i=0; i<$scope.data.skills.lists.length; i++){
			var list = $scope.data.skills.lists[i];
			for(var j=0; j<list.length; j++){
				$scope.data.skills.shifted_lists[i].push(list[j]);
			}
		}
		$scope.$emit('is_dirty');
	};

	// drag-drop handler
	$scope.dropHandler = function(evt, ui)
	{
		var skill = ui.draggable.find('span').first().text();
		var draggedLevel = angular.element(ui.draggable).parent().scope().level;
		var droppedLevel = angular.element(evt.target).scope().level;
		if( droppedLevel === undefined )
			droppedLevel = -1;
		
		if( draggedLevel != droppedLevel )
		{
			// remove from old group
			var pos = $scope.skills(draggedLevel).indexOf(skill);
			$scope.skills(draggedLevel).splice(pos,1);

			// add to new group (if not removing)
			if( droppedLevel != -1 ){
				$scope.skills(droppedLevel).push(skill);
				$scope.skills(droppedLevel).sort();
			}

			// update ui
			$scope.$apply();
			$scope.$emit('is_dirty');

			console.log('Moved skill from', draggedLevel, 'to', droppedLevel);
		}
	};


	$scope.$on('is_dirty', function(){ $scope.dirty = true; });
	$scope.$on('is_clean', function(){ $scope.dirty = false; });
}]);


// manage miscellaneous fields
//
app.controller('TotalsCtrl', ['$scope','SharedResources','rootModel', function($scope,SharedResources)
{
	$scope.editing = false;

	$scope.skillLabel = SharedResources.skillLabel;
	$scope.skillPointsSpent = SharedResources.skillPointsSpent;
	$scope.skillPointsAvailable = SharedResources.skillPointsAvailable;
	$scope.adjustedRefresh = SharedResources.adjustedRefresh;

	$scope.powerLevel = function()
	{
		if( $scope.data.totals.base_refresh < 7 ){
			return clientStrings.powerLevels.feet;
		}
		else if( $scope.data.totals.base_refresh < 8 ){
			return clientStrings.powerLevels.waist;
		}
		else if( $scope.data.totals.base_refresh < 10 ){
			return clientStrings.powerLevels.chest;
		}
		else {
			return clientStrings.powerLevels.submerged;
		}
	};

	$scope.$on('is_dirty', function(){ $scope.dirty = true; });
	$scope.$on('is_clean', function(){ $scope.dirty = false; });
}]);


// manage the set of stress tracks
//
app.controller('StressCtrl', ['$scope','rootModel', function($scope)
{
	$scope.editing = false;

	$scope.addTrack = function(){
		$scope.data.stress.push({
			'name': clientStrings.stress,
			'skill': clientStrings.skill,
			'toughness': 0,
			'strength': 2,
			'boxes': [],
			'armor': []
		});
		$scope.$emit('is_dirty');
	};

	$scope.$on('is_dirty', function(){ $scope.dirty = true; });
	$scope.$on('is_clean', function(){ $scope.dirty = false; });
}]);


// manage a single stress track
//
app.controller('StressTrackCtrl', ['$scope','SharedResources','rootModel', function($scope,SharedResources,rootModel)
{
	$scope.data = $scope.$parent.track;
	$scope.index = $scope.$parent.$index;

	$scope.$watchGroup(
		['data.strength','data.shiftedStrength','data.toughness','data.shiftedToughness'],
		function(newvals,oldvals){
			$scope.effectiveStrength = $scope.fields.shifted ? $scope.data.shiftedStrength || $scope.data.strength : $scope.data.strength;
			$scope.effectiveToughness = $scope.fields.shifted ? $scope.data.shiftedToughness || $scope.data.toughness : $scope.data.toughness;
			$scope.$emit('is_dirty');
		}
	);

	$scope.$watch('fields.shifted', function(newval){
		$scope.effectiveStrength = newval ? $scope.data.shiftedStrength || $scope.data.strength : $scope.data.strength;
		$scope.effectiveToughness = newval ? $scope.data.shiftedToughness || $scope.data.toughness : $scope.data.toughness;
	});

	$scope.$watch('effectiveStrength', function(newval){
		if(newval !== undefined){
			if( rootModel.data.skills.is_shifter && $scope.fields.shifted )
				$scope.data.shiftedStrength = newval;
			else
				$scope.data.strength = newval;
		}
	});

	$scope.$watch('effectiveToughness', function(newval){
		if(newval !== undefined){
			if( rootModel.data.skills.is_shifter && $scope.fields.shifted )
				$scope.data.shiftedToughness = newval;
			else
				$scope.data.toughness = newval;
		}
	});

	$scope.manageParens = function(boxIndex)
	{
		var classes = [];
		if( $scope.effectiveToughness > 0 && boxIndex == $scope.effectiveStrength-$scope.effectiveToughness )
			classes.push('leftParen');
		if( $scope.effectiveToughness > 0 && boxIndex == $scope.effectiveStrength-1 )
			classes.push('rightParen');
		return classes;
	};

	$scope.addArmor = function(){
		$scope.data.armor.push( {vs:'source', strength:0} );
		$scope.$emit('is_dirty');
	};

	$scope.removeArmor = function(i){
		$scope.data.armor.splice(i,1);
		$scope.$emit('is_dirty');
	};

	$scope.delete = function(){
		rootModel.data.stress.splice($scope.index,1);
		$scope.$emit('is_dirty');
	};
}]);


// consequence controller
//
app.controller('ConsequenceCtrl', ['$scope','rootModel', function($scope)
{
	$scope.editing = false;

	$scope.magnitude = function(severity)
	{
		switch(severity.toLowerCase()){
			case "mild": return -2;
			case "moderate": return -4;
			case "severe": return -6;
			case "extreme": return -8;
		}
	};

	$scope.stressTypes = function()
	{
		var types = [];
		for( var i in $scope.data.stress ){
			if( types.indexOf($scope.data.stress[i].name) == -1 ){
				types.push( $scope.data.stress[i].name );
			}
		}
		return types;

	};

	$scope.addConsequence = function()
	{
		$scope.data.consequences.push({
			'severity': 'Mild',
			'mode': 'Any',
			'used': false,
			'aspect': ''
		});
		$scope.$emit('is_dirty');
	};

	$scope.removeConsequence = function(i){
		$scope.data.consequences.splice(i,1);
		$scope.$emit('is_dirty');
	};

	$scope.addTempAspect = function()
	{
		$scope.data.aspects.tempAspects.push($scope.tempAspect);
		$scope.tempAspect = '';
		$scope.$emit('is_dirty');
	};

	$scope.removeTempAspect = function(i)
	{
		$scope.data.aspects.tempAspects.splice(i,1);
		$scope.$emit('is_dirty');
	};

	$scope.$on('is_dirty', function(){ $scope.dirty = true; });
	$scope.$on('is_clean', function(){ $scope.dirty = false; });
}]);


app.controller('PowersCtrl', ['$scope','SharedResources','rootModel', function($scope,SharedResources)
{
	$scope.editing = false;

	$scope.totalAdjustment = SharedResources.refreshSpent;

	$scope.addPower = function(){
		$scope.data.powers.push({
			'cost': 0,
			'name': clientStrings.newPower,
			'description': ''
		});
		$scope.$emit('is_dirty');
	};

	$scope.removePower = function(i){
		$scope.data.powers.splice(i,1);
		$scope.$emit('is_dirty');
	};

	$scope.sortOptions = {
		axis: 'y',
		cursor: 'move',
		handle: '.dragHandle'
	};

	$scope.$on('is_dirty', function(){ $scope.dirty = true; });
	$scope.$on('is_clean', function(){ $scope.dirty = false; });
}]);


// notes controller
//
app.controller('NotesCtrl', ['$scope','$sce','$sanitize','rootModel', function($scope, $sce, $sanitize)
{
	$scope.editing = false;

	if( !$scope.data.notes ){
		$scope.data.notes = {'text':'', 'enabled':false};
	}

	$scope.$on('is_dirty', function(){ $scope.dirty = true; });
	$scope.$on('is_clean', function(){ $scope.dirty = false; });
}]);

$(function(){
	angular.bootstrap( $('div.wrapper')[0], ['charsheet'] );
});
