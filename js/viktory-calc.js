var INF = 0;
var CAV = 1;
var ART = 2;

function Division( armies ) {
  var num_armies = armies.length;
  this.armies = [];
  this.pool = new Army();

  this.text = function() {
    var division_text = '';
    for( var i=0; i < this.armies.length; i++ ) {
      cur = this.armies[i];
      division_text += cur.text( String(i) + ':' ) + cur.elim_text( ' ' ) + '\n';
    }
    return division_text;
  };

  this.debug = function() {
    console.log( '   0   1   2' );
    console.log( this.text() );
    console.log( ' + ---------' );
    console.log( this.pool.text( '  ' ) + ' ... min: [ ' + elim_min_target[0] + ', ' + elim_min_target[1] + ' ]');
    console.log( '                 max: [ ' + elim_max_target[0] + ', ' + elim_max_target[1] + ' ]')
    console.log( '\n' );
  };

  this.eliminateUnits = function( dieRoll ) {
    if( typeof dieRoll === 'number' && dieRoll == 1 ) {
      this.armies[ elim_max[0] ].eliminateUnit( elim_max[1] );
    } else {
      this.armies[ elim_min[0] ].eliminateUnit( elim_min[1] );
    }
  }

  // --- calculate elimination weights for each army ---
  for (var a=0; a<num_armies; a++) {
    var cur = armies[a];
    var num_units = cur.numUnits();

    // can't eliminate from empty armies
    if( num_units == 0 ) {
      continue;

    } else {
      for( var t=0; t<3; t++ ) {
        // can't eliminate from empty troops
        if( cur.troops[t] == 0 ) {
          continue;
        }

       // 2nd bit is to weigh ART > CAV > INF 
        cur.elim_weights[t] += (t*0.1)

        // singles are valuable - eliminate first if possible
        if( cur.troops[t] == 1 ) {
          cur.elim_weights[t] += 1;
          if( num_units == 1 ) {
            cur.elim_weights[t] += 1;
          }
        }
      }
    }

    this.armies.push( cur );
    this.pool.add( cur );
  }

  // sort armies by num_units to break weight ties (try to get rid of
  //  smaller armies first in hopes you can eliminate it sooner)
  this.armies.sort( function(x, y) {
    var x_key = x.numUnits();
    var y_key = y.numUnits();
    if( x_key > y_key ) {
      return -1;
    } else if( x_key < y_key ) {
      return 1;
    }
    return 0;
  });

  // --- caclulate elimination weights for entire pool, target troop type w/ least units ---

  // which troop type has the least number of units in the force pool?
  // pool_min: how many units are there of that least troop type?
  var pool_min = 999;
  var pool_max = 0;
  for( var t=0; t<3; t++ ) {
    var cur_troop_count = this.pool.troops[t];

    // we only care about non-zero counts (can't eliminate 0 troops)
    if( cur_troop_count > 0 ) {
      // set the min and max
      if( cur_troop_count < pool_min ) {
        pool_min = cur_troop_count;
      }
      if( cur_troop_count > pool_max ) {
        pool_max = cur_troop_count;
      }
    }
  }

  if( pool_min < 1 ) {
    return;
  }

  for( var t=0; t<3; t++ ) {
    for( var a=0; a<num_armies; a++ ) {
      var cur = this.armies[a];

      // can't eliminate from nothing ...
      if( cur.troops[t] > 0 ) {
        // all troops get weighted by their row order (breaks ties)
        cur.elim_weights[t] += (a*0.001);

        // each troop of the current type gets weighed lowest to highest
        if( this.pool.troops[t] == pool_min ) { // lowest type
          cur.elim_weights[t] += 1;

          // if pool_min is 1, it will eliminate an entire troop type from the pool
          if( pool_min == 1 ) {
            cur.elim_weights[t] += 1;
          }

        } else if( this.pool.troops[t] == pool_max ) {
          cur.elim_weights[t] += 0; // largest type; do nothing

        } else {
          cur.elim_weights[t] += 0.5; // middle type
        }

      }
    }
  }

  // for each non-zero weight, find the min and max, and store their location
  var elim_min = 999;
  var elim_min_target = [ NaN, NaN ];
  var elim_max = 0;
  var elim_max_target = [ NaN, NaN ];

  // elim_max_target is the most valuable target
  // elim_min_target is the least valuable target
  for( var a=0; a<num_armies; a++ ) {
    var cur = this.armies[a];
    for( var t=0; t<3; t++ ) {
      if( cur.elim_weights[t] > 0 ) {
        if( cur.elim_weights[t] > elim_max ) {
          elim_max = cur.elim_weights[t];
          elim_max_target = [ a, t ];
        }
        if( cur.elim_weights[t] < elim_min ) {
          elim_min = cur.elim_weights[t];
          elim_min_target = [ a, t ];
        }
      }
    }
  }

  /* TODO ... don't forget that you might choose differently if you get >1 hits
       ie 1 / 1 / 3 ... if you've got 3 hits, the current algorithm will choose:
         1 cav, then 1 inf, then 1 art ... resulting in: 0 / 0 / 2
         is that better than eliminating 3 art, result:  1 / 1 / 3 ?
  */

  this.debug();
}

function Army( infantry, cavalry, artillery )
{

  this.troops = [ parseInt(infantry) || 0,
                  parseInt(cavalry) || 0,
                  parseInt(artillery) || 0 ];

  this.elim_weights = [ 0.0, 0.0, 0.0 ]; 

  this.numUnits = function() {
    return this.troops[INF] + this.troops[CAV] + this.troops[ART];
  };

  this.hasUnits = function() {
    return this.numUnits() > 0;
  };

  this.text = function( label='' ) {
    return label + ' ' + this.troops[INF] + " / " + this.troops[CAV] + " / " + this.troops[ART];
  };

  this.elim_text = function( label='' ) {
    return label + ' ( ' + this.elim_weights[0].toFixed(3) + ' / '
                         + this.elim_weights[1].toFixed(3) + ' / '
                         + this.elim_weights[2].toFixed(3) + ' )';
  };

  this.add = function( rhs ) {
    for( var i=0; i<3; i++ ) {
      this.troops[i] += rhs.troops[i];
    }
  };

  this.eliminateUnit = function( troop_type ) {
    this.troops[troop_type] -= 1;
    if( this.troops[troop_type] < 0 ) {
      console.log( "att: negative unit count!");
    }
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
    { defender.eliminateUnits( roll ); }
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
      { defender.eliminateUnits( roll ); }
    }

    for( i = 0; i < defenderArtilleryCopy; i++ )
    {
      roll = Math.floor((Math.random()*6)+1);
      if( roll <= defenderHighHit )
      { attacker.eliminateUnits( roll ); }
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
          if( ! defender.eliminateUnits( roll ) )
          { attackerExtraHits++; }
        }
      }

      // roll for defender
      var defenderNumDice = defenderCopy.getDefendDice( attackerExtraHits );
      for( i = 0; i < defenderNumDice; i++ )
      {
        roll = Math.floor((Math.random()*6)+1);
        if( roll <= defenderHighHit )
        { attacker.eliminateUnits( roll ); }
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
  $('.dice-modifier').bind( 'change', function() {
    clearResults();
    update();
  } );
  reset();

  /* *** */
  var armies = [new Army(2,3,1), new Army(1,1,1), new Army(0,1,1)];
  Division( armies );
  var armies = [new Army(1,3,0), new Army(0,1,0), new Army(0,1,1)];
  Division( armies );
  var armies = [new Army(1,3,3), new Army(0,1,0)];
  Division( armies );
  var armies = [new Army(0,1,3), new Army(0,1,1), new Army(1, 1, 1), new Army(1, 1, 0)];
  Division( armies );
  var armies = [new Army(1,3,3)];
  Division( armies );
  var armies = [new Army(0,3,2)];
  Division( armies );
  var armies = [new Army(1,3,1)];
  Division( armies );
  var armies = [new Army(2,0,2)];
  Division( armies );
  /*var armies = [new Army(1,1,1), new Army(0,1,1)];
  Division( armies );
  var armies = [new Army(0,3,1), new Army(0,1,0)];
  Division( armies );
  var armies = [new Army(0,2,0), new Army(0,5,0)];
  Division( armies );
  var armies = [new Army(0,2,0), new Army(0,2,0)];
  Division( armies );
  */
} );

