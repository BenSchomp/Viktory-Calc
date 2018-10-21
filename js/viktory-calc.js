var INF = 0;
var CAV = 1;
var ART = 2;

function Division( armies ) {
  console.log( "Division()" );
  var n = armies.length;
  this.armies = [];
  this.pool = new Army();
  this.division_text = '';

  for (var i = 0; i < n; i++) {
    var cur = armies[i];
    var num_units = cur.numUnits();
    
    if( num_units == 0 ) {
      continue;
    } else if( num_units == 1 ) {
      cur.handleSingle();

    } else {
      console.log( '>1 units' );
    }

    this.division_text += cur.text( String(i + 1) + ':' ) + ' (' + cur.elimWeights() + ')\n';
    this.armies.push( cur );
    this.pool.add( cur );
  }

  this.text = function() {
    return this.division_text;
  };

  console.log( this.text() );
  console.log( '---------' );
  console.log( this.pool.text( 'pool:' ) );
}

function Army( infantry, cavalry, artillery )
{

  this.troops = [ parseInt(infantry) || 0,
                  parseInt(cavalry) || 0,
                  parseInt(artillery) || 0 ];

  this.elim_weights = [ 0, 0, 0 ]; 
  this.elimWeights = function() {
    return this.elim_weights;
  }

  this.numUnits = function() {
    return this.troops[INF] + this.troops[CAV] + this.troops[ART];
  };

  this.hasUnits = function() {
    return this.numUnits() > 0;
  };

  this.text = function( label ) {
    return label + ' ' + this.troops[INF] + " / " + this.troops[CAV] + " / " + this.troops[ART];
  };

  this.add = function( rhs ) {
    for( var i=0; i<3; i++ ) {
      this.troops[i] += rhs.troops[i];
    }
  };

  this.handleSingle = function() {
    if( this.numUnits > 1 ) {
      return;
    }

    // reverse, in order of value (ART, CAV, INF)
    for( var i=3; i>=0; i-- ) {
      if( this.troops[i] == 1 ) {
        this.elim_weights[i] += 1;
      }
    }

  }

  this.eliminateUnit = function( dieRoll ) {
    if( typeof dieRoll === 'number' && dieRoll == 1 )
    {
      // selective hit (eliminate most valuable)
      if( this.artillery > 0 )
      { this.artillery--; }
      else if( this.cavalry > 0 )
      { this.cavalry--; }
      else if( this.infantry > 0 )
      { this.infantry--; }
      else
      { return false; }
    }
    else
    {
      // non-selective hit (eliminate least valuable)
      if( this.infantry > 0 )
      { this.infantry--; }
      else if( this.cavalry > 0 )
      { this.cavalry--; }
      else if( this.artillery > 0 )
      { this.artillery--; }
      else
      { return false; }
    }

    return true;
  };

  this.getAttackDice = function() {
    return 1; 
  }

  this.getDefendDice = function() {
    return 1; 
  }
}

function isTown() {
  return ( $('input[name=settlement]:checked', '#simform').val() == 'town' );
}

function isCity() {
  return ( $('input[name=settlement]:checked', '#simform').val() == 'city' );
}

function isCapitalLost() {
  return ( $('input[name=defenderlostcapital]:checked', '#simform').val() == 'yes' );
}

function isForest() {
  return ( $('input[name=terrain]:checked', '#simform').val() == 'forest' );
}

function isMountain() {
  return ( $('input[name=terrain]:checked', '#simform').val() == 'mountain' );
}

function isTownOrCity() {
  return isTown() || isCity();
}

function hasNavalSupport() {
  return ( $('input[name=navalsupport]:checked', '#simform').val() == 'yes' );
}

function isNoPreBattle() {
  return ( $('input[name=noprebattle]:checked', '#simform').val() == 'no' );
}

function getPercent( value, n )
{
  return ( ( value / n ) * 100 ).toFixed( 2 ) + "%"; 
}

function displayWinResults( attackerWins, defenderWins, ties, n )
{
  $("#attacker-win-results").val( getPercent( attackerWins, n ) );
  $("#defender-win-results").val( getPercent( defenderWins, n ) );
  $("#ties-results").val( getPercent( ties, n ) );

  clearResults();

  var ff = 100; // fudge factor: only mark green if difference is > 10%

  if( attackerWins > ( defenderWins + ff ) && attackerWins > ( ties + ff )  )
  { $("#attacker-win-results").css( 'background', 'lightgreen' ); }
  else if( defenderWins > ( attackerWins + ff ) && defenderWins > ( ties + ff ) )
  { $("#defender-win-results").css( 'background', 'lightgreen' ); }
  else if( ties > ( attackerWins + ff ) && ties > ( defenderWins + ff ) )
  { $("#ties-results").css( 'background', 'lightgreen' ); }
  else
  {
    // no clear winner, mark the too-close-to-call in yellow
    if( Math.abs( attackerWins - defenderWins ) < ff )
    {
      $("#attacker-win-results").css( 'background', 'khaki' );
      $("#defender-win-results").css( 'background', 'khaki' );
    }
    if( Math.abs( attackerWins - ties ) < ff )
    {
      $("#attacker-win-results").css( 'background', 'khaki' );
      $("#ties-results").css( 'background', 'khaki' );
    }
    if( Math.abs( ties - defenderWins ) < ff )
    {
      $("#ties-results").css( 'background', 'khaki' );
      $("#defender-win-results").css( 'background', 'khaki' );
    }
  }
}

function displayUnitResults( label, totals, n )
{
  $("#" + label + "-infantry-results").val( totals.infantry / n );
  $("#" + label + "-cavalry-results").val( totals.cavalry / n );
  $("#" + label + "-artillery-results").val( totals.artillery / n );
}

function getAttackerDice( attacker ) {
  console.log( "getAttackerDice:", attacker, attacker.troops );
  var numDice = 0;

  // each type of unit gets a die roll
  var unit;
  for( unit in attacker.troops )
  {
    if( attacker[unit] > 0 )
    { numDice++; }
  }

  // each add'l hex side gets a die roll
  if( numDice )
  {
    // can't have more sides than total troops
    // TODO: update form field max value
    var attackSides = 1;
    /*
      Math.min(
        $("#attacker-sides").val(),
        parseInt(attacker.infantry) + parseInt(attacker.cavalry) + parseInt(attacker.artillery) );
        */
    numDice += attackSides - 1;
  }

  console.log( numDice );
  return numDice;
}

function getDefenderDice( defender, extraHits ) {
  console.log( "getDefenderDice:", defender, extraHits );
  var numDice = 0;
  var numDice_Units = 0;
  var numDice_Defense = 0;

  // each type of unit gets a die roll
  var unit;
  for( unit in defender.troops )
  {
    if( defender[unit] > 0 )
    { numDice_Units++; }
  }

  // settlement defense
  if( isCity() && isCapitalLost() )
  { numDice_Defense = 1; }
  else if( isCity() )
  { numDice_Defense = 2; }
  else if( isTown() )
  { numDice_Defense = 1; }

  // terrain defense
  if( isMountain() )
  { numDice_Defense = 2; }
  else if( isForest() )
  { numDice_Defense = Math.max( numDice_Defense, 1 ); }

  // one or more adjacent frigates add naval support
  if( hasNavalSupport() )
  { numDice_Defense++; }

  // defender suppression: extra attacker hits reduce defensive return fire
  if( typeof extraHits === 'number' )
  {
    if( isTownOrCity() )
    { numDice = Math.max( numDice_Units - extraHits, 0 ) + numDice_Defense; }
    else
    { numDice = Math.max( numDice_Units + numDice_Defense - extraHits, 0 ); }
  }
  else
  { numDice = numDice_Units + numDice_Defense; }

  console.log( numDice );
  return numDice;
}

function runOneSim() {
  var attacker = new Army(
    $("#attacker-infantry-1").val(),
    $("#attacker-cavalry-1").val(),
    $("#attacker-artillery-1").val()
  );
  var defender = new Army(
    $("#defender-infantry").val(),
    $("#defender-cavalry").val(),
    $("#defender-artillery").val()
  );

  var attackerHighHit = 3;
  if( $('input:radio[name=attackercombatsupply]:checked').val() == "yes" )
  { attackerHighHit++; }

  var defenderHighHit = 3;
  if( $('input:radio[name=defendercombatsupply]:checked').val() == "yes" )
  { defenderHighHit++; }

  var i = 0;
  var roll = 6;
  var numRounds = 0;

  // bombard attacks occur before battle begins
  var bombardAttacks = $("#attacker-bombards-1").val();
  for( i = 0; i < bombardAttacks; i++ )
  {
    roll = Math.floor((Math.random()*6)+1);
    if( roll <= attackerHighHit )
    { defender.eliminateUnit( roll ); }
  }

  // pre-battle artillery fire
  if( ! isNoPreBattle() )
  {
    // store a copy of the defender's pre-attack artillery count
    var defenderArtilleryCopy = defender.artillery;

    for( i = 0; i < attacker.artillery; i++ )
    {
      roll = Math.floor((Math.random()*6)+1);
      if( roll <= attackerHighHit )
      { defender.eliminateUnit( roll ); }
    }

    for( i = 0; i < defenderArtilleryCopy; i++ )
    {
      roll = Math.floor((Math.random()*6)+1);
      if( roll <= defenderHighHit )
      { attacker.eliminateUnit( roll ); }
    }
  }

  // now only do battle if the attacker has units and/or the
  //  defender has units or we're in a town or city hex
  if( attacker.hasUnits() && ( defender.hasUnits() || isTownOrCity() ) )
  {
    do
    {
      // store a copy of the defender's pre-attack unit counts
      var defenderCopy = new Army( defender.infantry, defender.cavalry, defender.artillery );

      // roll for attacker
      var attackerExtraHits = 0;
      var attackerNumDice = attacker.getAttackDice();
      for( i = 0; i < attackerNumDice; i++ )
      {
        roll = Math.floor((Math.random()*6)+1);
        if( roll <= attackerHighHit )
        { 
          if( ! defender.eliminateUnit( roll ) )
          { attackerExtraHits++; }
        }
      }

      // roll for defender
      var defenderNumDice = defenderCopy.getDefendDice( attackerExtraHits );
      for( i = 0; i < defenderNumDice; i++ )
      {
        roll = Math.floor((Math.random()*6)+1);
        if( roll <= defenderHighHit )
        { attacker.eliminateUnit( roll ); }
      }

      numRounds++;
    } while( attacker.hasUnits() && defender.hasUnits() );
  }
  
  return { "attacker": attacker, "defender": defender, "numRounds": numRounds };
}

function runSim() {
  console.log('runSim()');
  var attackerTotals = new Army();
  var defenderTotals = new Army();
  var numRoundsTotal = 0;
  var attackerWins = 0;
  var defenderWins = 0;
  var ties = 0;

  var n = 1000;
  var i = 0;
  for( i = 0; i < n; i++ )
  {
    var results = runOneSim();
    attackerTotals.add( results.attacker );
    defenderTotals.add( results.defender );
    if( results.attacker.hasUnits() )
    { attackerWins++; }
    else if( results.defender.hasUnits() )
    { defenderWins++; }
    else
    { ties++; }

    numRoundsTotal += results.numRounds;
  }

  displayWinResults( attackerWins, defenderWins, ties, n );
  displayUnitResults( "attacker", attackerTotals, n );
  displayUnitResults( "defender", defenderTotals, n );
  $("#numRounds-results").val( numRoundsTotal / n );
}

function update() {
  console.log( "update()" );
  var attackSides = 0;
  var attackers = new Army();

  for(var i=1; i<7; i++) {
    var cur = new Army(
      $("#attacker-infantry-"+i).val(),
      $("#attacker-cavalry-"+i).val(),
      $("#attacker-artillery-"+i).val() );

    if(cur.hasUnits()) {
      attackSides += 1;
      $("#side-"+i).css('visibility', 'visible');
    } else {
      $("#side-"+i).css('visibility', 'hidden');
    }

    attackers.add(cur);
  }

  var attackerDice = attackers.getAttackDice() + Math.max(attackSides-1, 0);
  $("#attacker-dice").val( attackerDice );

  var defender =
    new Army(
      $("#defender-infantry").val(),
      $("#defender-cavalry").val(),
      $("#defender-artillery").val()
    );

  var defenderDice = defender.getDefendDice();
  $("#defender-dice").val( defenderDice );

  if( attackerDice > 0 && defenderDice > 0 )
  { $("#calculatebutton").attr( "disabled", false ); }
  else
  { $("#calculatebutton").attr( "disabled", "disabled" ); }

  // TODO
  if( $("#attacker-artillery").val() > 0 || $("#defender-artillery").val() > 0 )
  { $(".noprebattle").attr( "disabled", false ); }
  else
  { $(".noprebattle").attr( "disabled", "disabled" ); }

}

function clearResults() {
  $("#results-table :input").css( "background", "" );
}

function reset() {
  $(".reset-zero").each( function() {
    this.value = "0";
  } );

  $(".reset").prop( "checked", true );

  $(".results").each( function() {
    this.value = "";
  } );

  clearResults();
  update();
}

$(document).ready( function () {
  console.log("TODO:");
  console.log("  * runSim() to consider armies from all hexes");
  console.log("  * runSim() to eliminate units based on their attack side affecting attack dice count");
  $('.dice-modifier').bind( 'change', function() {
    clearResults();
    update();
  } );
  reset();

  /* *** */
  var armies = [new Army(1,2,3), new Army(1,0,0), new Army(0,0,1)];
  Division( armies );
} );

