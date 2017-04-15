function Army( infantry, cavalry, artillery )
{
  this.infantry = infantry || 0;
  this.cavalry = cavalry || 0;
  this.artillery = artillery || 0;

  this.numUnits = function() {
    return parseInt(this.infantry) + parseInt(this.cavalry) + parseInt(this.artillery);
  };

  this.hasUnits = function() {
    return this.numUnits() > 0;
  };

  this.text = function( label ) {
    return this.infantry + " / " + this.cavalry + " / " + this.artillery;
  };

  this.add = function( rhs ) {
    this.infantry += parseInt( rhs.infantry );
    this.cavalry += parseInt( rhs.cavalry );
    this.artillery += parseInt( rhs.artillery );
  };

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
  var numDice = 0;

  // each type of unit gets a die roll
  var unit;
  for( unit in attacker )
  {
    if( attacker[unit] > 0 )
    { numDice++; }
  }

  // each add'l hex side gets a die roll
  if( numDice )
  {
    // can't have more sides than total troops
    // TODO: update form field max value
    var attackSides =
      Math.min(
        $("#attacker-sides").val(),
        parseInt(attacker.infantry) + parseInt(attacker.cavalry) + parseInt(attacker.artillery) );
    numDice += attackSides - 1;
  }

  return numDice;
}

function getDefenderDice( defender, extraHits ) {
  var numDice = 0;
  var numDice_Units = 0;
  var numDice_Defense = 0;

  // each type of unit gets a die roll
  var unit;
  for( unit in defender )
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
  if( $("#defender-navalsupport").attr("checked") )
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

  return numDice;
}

function runOneSim() {
  var attacker = new Army(
    $("#attacker-infantry").val(),
    $("#attacker-cavalry").val(),
    $("#attacker-artillery").val()
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
  for( i = 0; i < $("#attacker-bombards").val(); i++ )
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
      var attackerNumDice = getAttackerDice( attacker );
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
      var defenderNumDice = getDefenderDice( defenderCopy, attackerExtraHits );
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
  var attackerTotals = new Army();
  var defenderTotals = new Army();
  var numRoundsTotal = 0;
  var attackerWins = 0;
  var defenderWins = 0;
  var ties = 0;

  //var n = $("input[name=numsimiterations]:checked", "#optionsform").val();
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

function updateDice() {
  var attackers = new Army(
      $("#attacker-infantry").val(),
      $("#attacker-cavalry").val(),
      $("#attacker-artillery").val() );
  var attackerDice = getAttackerDice( attackers );
  $("#attacker-dice").val( attackerDice );

  var defenderDice = getDefenderDice(
    new Army(
      $("#defender-infantry").val(),
      $("#defender-cavalry").val(),
      $("#defender-artillery").val()
    ) );
  $("#defender-dice").val( defenderDice );

  if( attackerDice > 0 && defenderDice > 0 )
  { $("#calculatebutton").attr( "disabled", false ); }
  else
  { $("#calculatebutton").attr( "disabled", "disabled" ); }

  if( $("#attacker-artillery").val() > 0 || $("#defender-artillery").val() > 0 )
  { $("#noprebattle").attr( "disabled", false ); }
  else
  { $("#noprebattle").attr( "disabled", "disabled" ); }

  var sides = $("#attacker-sides").val();
  var numAttackers = attackers.numUnits();
  var maxAttackers = Math.max( numAttackers, 1 );
  $("#attacker-sides").attr('max', Math.min(maxAttackers, 6));

  if( sides > maxAttackers ) {
    $("#attacker-sides").css( 'background', 'yellow' );
    $("#attacker-sides").animate({
      backgroundColor: '#ffffff'
  }, 2500 );
    $("#attacker-sides").val( maxAttackers );
  } else {
    $("#attacker-sides").css( 'background', "" );
  }
}

function clearResults() {
  $("#results-table :input").css( "background", "" );
}

function reset() {
  $(".units").each( function() {
    this.value = "0";
  } );

  $("#defender-navalsupport,#noprebattle")
    .attr( "checked", false );

  $("#attacker-bombards").val( 0 );
  $("#attacker-sides").val( 1 );
  $(".reset").attr( "checked", "checked" );

  $(".results").each( function() {
    this.value = "";
  } );

  clearResults();
  updateDice();
}

$(document).ready( function () {
  $('.dice-modifier').bind( 'change', function() {
    clearResults();
    updateDice();
  } );
  reset();
} );

