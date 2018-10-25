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
      division_text += cur.text( String(i) + ':' ) + cur.elim_text() + '\n';
    }
    return division_text;
  };

  this.eliminateUnits = function( dieRoll ) {
  }

  // calculate elimination weights for each army
  for (var a=0; a<num_armies; a++) {
    var cur = armies[a];
    var num_units = cur.numUnits();

    if( num_units == 0 ) {
      continue;

    } else {
      for( var t=0; t<3; t++ ) {
        if( cur.troops[t] == 0 ) {
          continue;
        }

        cur.elim_weights[t] += (t*0.1) // this weights ART > CAV > INF

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

  // caclulate elimination weights for entire pool, target troop type w/ least units
  var pool_min = 999;
  for( var t=0; t<3; t++ ) {
    var cur = this.pool.troops[t];
    if( cur > 0 && cur < pool_min ) {
      pool_min = cur;
    }
  }

  var army_min = 999;
  var army_min_target = -1;
  if( pool_min > 0 ) {
    var weight_inc = 1;
    if( pool_min == 1 ) {
      weight_inc += 1;
    }

    for( var t=0; t<3; t++ ) {
      if( this.pool.troops[t] == pool_min ) {
        for( var a=0; a<num_armies; a++ ) {
          var cur = this.armies[a];
          if( cur.troops[t] > 0 ) {
            cur.elim_weights[t] += weight_inc;

            if( cur.numUnits() < army_min ) {
              army_min = cur.numUnits();
              army_min_target = a;
            }
          }
        }
      }
    }

    var elim_max = -1;
    var elim_army_target = -1;
    var elim_troop_target = -1;
    for( var a=0; a<num_armies; a++ ) {
      for( var t=0; t<3; t++ ) {
        var cur = this.armies[a];
        if( cur.troops[t] > 0 && a == army_min_target ) {
          cur.elim_weights[t] += 0.05;
        }

        if( cur.elim_weights[t] > elim_max ) {
          elim_max = cur.elim_weights[t];
          elim_army_target = a;
          elim_troop_target = t;
        }
      }
    }

  /* TODO ... don't forget that you might choose differently if you get >1 hits
       ie 1 / 1 / 3 ... if you've got 3 hits, the current algorithm will choose:
         1 cav, then 1 inf, then 1 art ... resulting in: 0 / 0 / 2
         is that better than eliminating 3 art, result:  1 / 1 / 3 ?
  */

  }


  console.log( this.text() );
  console.log( '---------' );
  console.log( this.pool.text( 'D:' ) + ' ... target: [ ' + elim_army_target + ', ' + elim_troop_target + ' ] ');
  console.log( '\n' );
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
    return label + ' ( ' + this.elim_weights[0].toFixed(2) + ' / '
                         + this.elim_weights[1].toFixed(2) + ' / '
                         + this.elim_weights[2].toFixed(2) + ' )';
  };

  this.add = function( rhs ) {
    for( var i=0; i<3; i++ ) {
      this.troops[i] += rhs.troops[i];
    }
  };

  this.elimCalc = function() {
    var num_units = this.numUnits();
    for( var i=0; i<3; i++ ) {
      if( this.troops[i] == 1 ) {
        this.elim_weights[i] += 1;
        if( num_units == 1 ) {
          this.elim_weights[i] += 1;
        }
      }
    }

  }

  this.eliminateUnits = function( infantry, cavalry, artillery ) {
    this.infantry -= infantry;
    this.cavalry -= cavalry;
    this.artillery -= artillery;
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
  var armies = [new Army(0,3,3), new Army(0,1,0)];
  Division( armies );
  var armies = [new Army(1,3,3)];
  Division( armies );
  var armies = [new Army(0,3,2)];
  Division( armies );
  var armies = [new Army(1,3,1)];
  Division( armies );
  var armies = [new Army(2,0,2)];
  Division( armies );
  var armies = [new Army(1,1,1), new Army(0,1,1)];
  Division( armies );
  var armies = [new Army(0,3,1), new Army(0,1,0)];
  Division( armies );
  var armies = [new Army(0,2,0), new Army(0,5,0)];
  Division( armies );
  var armies = [new Army(0,2,0), new Army(0,2,0)];
  Division( armies );
} );

