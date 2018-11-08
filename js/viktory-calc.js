var DEBUG = false;
var INF = 0;
var CAV = 1;
var ART = 2;

function Division( armies ) {
  this.armies = []; // each individual Army in the Divion (1 for each attacking hex)
  this.pool = new Army(); // the total force pool of all armies added together

  for( var a=0; a<armies.length; a++ ) {
    var cur = armies[a];
    if( cur.numUnits() > 0 ) {
      this.armies.push( cur );
      this.pool.add( cur );
    }
  }

  /*
    TODO: write a copy constructor and object serializer
           need to be able to output the entire game state to the results.log
           might also be nice to be able to start saving url's
  */

  this.hasUnits = function() {
    return this.pool.hasUnits();
  }

  this.numInf = function() {
    return this.pool.troops[INF];
  }

  this.numCav = function() {
    return this.pool.troops[CAV];
  }

  this.numArt = function() {
    return this.pool.troops[ART];
  }

  this.print = function( label, showElimWeights=false, level ) {
    var division_text = label;
    for( var i=0; i < this.armies.length; i++ ) {
      cur = this.armies[i];

      division_text += cur.text();
      if( showElimWeights ) {
        division_text += cur.elim_text( ' ' );
      }
      debug( division_text, level );
      division_text = ' '.repeat(label.length);
    }
  };

  this.getAttackerDice = function() {
    var numDice = this.pool.getCombatDice();
    numDice += this.armies.length - 1;
    return Math.max( numDice, 0 );
  }

  /*
    TODO: there is some inefficiency here - since this is called 1000 times,
           the initial elim_weights values only need to be calculated once.
           If it is instead a member variable and calculated on instantiation
           it would reduce iteration within the eliminateUnits() call.
           However, since each of the 1000 outer calls will result in a different
           and random path towards one force pool being eliminated, there will
           be many different calculations along the way.
           Instead, should implement a hash function and stand up a redis instance
           for n-time lookups. However this is not a requirement for a functioning
           system, but a nice-to-have geek out.
  */
  this.eliminateUnits = function( dieRoll ) {
    var num_armies = this.armies.length;
    var num_troops = 0;

    // --- calculate elimination weights for each army ---
    for (var a=0; a<num_armies; a++) {
      var cur = this.armies[a];
      var num_units = cur.numUnits();
      num_troops += num_units;

      if( num_units == 0 ) {
        continue;

      } else {
        for( var t=0; t<3; t++ ) {
          if( cur.troops[t] == 0 ) {
            continue;
          }

          // 2nd bit is to weigh ART > CAV > INF
          cur.elim_weights[t] += (t+1)*0.1

          // singles are valuable - eliminate first if possible
          if( cur.troops[t] == 1 ) {
            cur.elim_weights[t] += 1;

            // if its the only single, its very valuable
            if( num_units == 1 ) {
              cur.elim_weights[t] += 1.5;
              break; // only 1 unit, go to next army
            }
          }
        }
      }
    }

    if( num_troops < 1 ) {
      debug( '(force depleted)', 3);
      return false;
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

    for( var t=0; t<3; t++ ) {
      for( var a=0; a<num_armies; a++ ) {
        var cur = this.armies[a];

        if( cur.troops[t] > 0 ) {
          // all troops get weighted by their row order (breaks ties)
          cur.elim_weights[t] += (a*0.01);

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

    this.print('before:', true, 3);

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
      cur.elim_weights = [ 0, 0, 0 ];
    }

    /* TODO ... don't forget that you might choose differently if you get >1 hits
         ie 1 / 1 / 3 ... if you've got 3 hits, the current algorithm will choose:
           1 cav, then 1 inf, then 1 art ... resulting in: 0 / 0 / 2
           is that better than eliminating 3 art, result:  1 / 1 / 3 ?
    */

    if( typeof dieRoll === 'number' && dieRoll == 1 ) {
      this.armies[ elim_max_target[0] ].eliminateUnit( elim_max_target[1] );
      this.pool.eliminateUnit( elim_max_target[1] );
    } else {
      this.armies[ elim_min_target[0] ].eliminateUnit( elim_min_target[1] );
      this.pool.eliminateUnit( elim_min_target[1] );
    }

    this.print('after: ', false, 3);
    return true;
  }
}

function Army( infantry, cavalry, artillery )
{

  this.troops = [ parseInt(infantry) || 0,
                  parseInt(cavalry) || 0,
                  parseInt(artillery) || 0 ];

  this.elim_weights = [ 0, 0, 0 ]; 

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
    return label + ' [ ' + this.elim_weights[0].toFixed(2) + ' / '
                         + this.elim_weights[1].toFixed(2) + ' / '
                         + this.elim_weights[2].toFixed(2) + ' ]';
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

  this.getCombatDice = function() {
    var numDice = 0;

    // each type of unit gets a die roll
    var unit;
    for( unit in this.troops )
    {
      if( this.troops[unit] > 0 )
      { numDice++; }
    }

    return numDice;
  }

  this.getDefenderDice = function( extraHits ) {
    // defenderDice = army's combat dice + hex bonus
    var numDice = 0;
    var numDice_Units = this.getCombatDice();
    var numDice_Defense = 0;

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

    return numDice;
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
  $("#" + label + "-infantry-results").val( totals.troops[INF] / n );
  $("#" + label + "-cavalry-results").val( totals.troops[CAV] / n );
  $("#" + label + "-artillery-results").val( totals.troops[ART] / n );
}

function rollDice( label, numDice, highHit, targetD ) {
  var diceText = 'dice';
  if( numDice == 1 ) {
    diceText = 'die';
  } else if( numDice < 1 ) {
    return 0; // no dice to roll
  }
  debug( label + ' rolling ' + numDice + ' ' + diceText + ' ...', 1 );

  var rolls = [];
  var extraHits = 0;
  for( var i=0; i<numDice; i++ ) {
    rolls.push( Math.floor((Math.random()*6)+1) );
  }
  rolls.sort();

  for( var i=0; i<rolls.length; i++ ) {
    var roll = rolls[i];
    if( roll > highHit ) {
      break; // rolls is sorted, everything here and after are misses
    }

    var text = 'Hit: ' + roll;
    if( roll == 1 ) {
      text += ' (tactical)';
    }
    debug( text, 2 );

    if( ! targetD.eliminateUnits( roll ) ) {
      // defender supression
      extraHits++;
    }
  }

  return extraHits;
}

function runOneSim() {
  var armies = [];
  var bombardAttacks = 0;

  for(var i=1; i<7; i++) {
    var cur = new Army( $("#attacker-infantry-"+i).val(),
                        $("#attacker-cavalry-"+i).val(),
                        $("#attacker-artillery-"+i).val() );

    if(cur.hasUnits()) {
      $("#side-"+i).css('visibility', 'visible');
    } else {
      $("#side-"+i).css('visibility', 'hidden');
    }

    bombardAttacks += parseInt($("#attacker-bombards-"+i).val());
    armies.push(cur);
  } 

  var attackerD = new Division( armies );
  armies = [ new Army( $("#defender-infantry").val(),
                       $("#defender-cavalry").val(),
                       $("#defender-artillery").val() ) ];
  var defenderD = new Division( armies );

  var attackerHighHit = 3;
  if( $('input:radio[name=attackercombatsupply]:checked').val() == "yes" )
  { attackerHighHit++; }

  var defenderHighHit = 3;
  if( $('input:radio[name=defendercombatsupply]:checked').val() == "yes" )
  { defenderHighHit++; }


  // bombard attacks occur before battle begins
  if( bombardAttacks > 0 ) {
    debug( '+ Bombard Attacks:' );
    rollDice( 'Attacker', bombardAttacks, attackerHighHit, defenderD );
  }

  // pre-battle artillery fire
  if( ! isNoPreBattle() )
  {
    var defenderNumArt = defenderD.numArt();
    var attackerNumArt = attackerD.numArt();

    if( attackerNumArt > 0 || defenderNumArt > 0 ) {
      debug( '+ Pre-Battle Atrillery:' );
      rollDice( 'Attacker', attackerNumArt, attackerHighHit, defenderD );
      rollDice( 'Defender', defenderNumArt, defenderHighHit, attackerD );
    }
  }

  // now only do battle if the attacker has units and/or the
  //  defender has units or we're in a town or city hex
  var numRounds = 0;
  if( attackerD.hasUnits() && ( defenderD.hasUnits() || isTownOrCity() ) )
  {
    do
    {
      debug( "+ Battle Round: " + (numRounds + 1) );
      // store a copy of the defender's pre-attack unit counts
      var defenderCopy = new Army( defenderD.numInf(), defenderD.numCav(), defenderD.numArt() );

      // roll for attacker
      var attackerNumDice = attackerD.getAttackerDice();
      var attackerExtraHits = rollDice( 'Attacker', attackerNumDice, attackerHighHit, defenderD );

      // roll for defender
      var defenderNumDice = defenderCopy.getDefenderDice( attackerExtraHits );
      rollDice( 'Defender', defenderNumDice, defenderHighHit, attackerD );

      numRounds++;
    } while( attackerD.hasUnits() && defenderD.hasUnits() );
  }
  
  return { "attacker": attackerD.pool, "defender": defenderD.pool, "numRounds": numRounds };
}

function runSim() {
  var attackerTotals = new Army();
  var defenderTotals = new Army();
  var numRoundsTotal = 0;
  var attackerWins = 0;
  var defenderWins = 0;
  var ties = 0;

  var n = 1000;
  for( var i=0; i<n; i++ )
  {
    debug( '--- Run ' + (i+1) + ' ---' );
    var results = runOneSim();

    attackerTotals.add( results.attacker );
    defenderTotals.add( results.defender );

    if( results.attacker.hasUnits() ) {
      debug( "** Attacker wins!" );
      attackerWins++;
    } else if( results.defender.hasUnits() ) {
      debug( "** Defender wins!" );
      defenderWins++;
    } else {
      debug( "** Tie." );
      ties++;
    }
    debug( "\n" );

    numRoundsTotal += results.numRounds;
  }

  displayWinResults( attackerWins, defenderWins, ties, n );
  displayUnitResults( "attacker", attackerTotals, n );
  displayUnitResults( "defender", defenderTotals, n );
  $("#numRounds-results").val( numRoundsTotal / n );

  debug( '--- Done. ---' );
  $.post( "logger.php" ); // write result to server log
}

function update() {
  var armies = [];
  var hasAttackerArtillery = false;

  for(var i=1; i<7; i++) {
    var cur = new Army(
      $("#attacker-infantry-"+i).val(),
      $("#attacker-cavalry-"+i).val(),
      $("#attacker-artillery-"+i).val() );

    if(cur.hasUnits()) {
      $("#side-"+i).css('visibility', 'visible');
    } else {
      $("#side-"+i).css('visibility', 'hidden');
    }

    if( parseInt( $("#attacker-artillery-"+i).val() ) > 0 ) {
      hasAttackerArtillery = true;
    }

    armies.push(cur);
  }

  var attacker = new Division( armies );
  var attackerDice = attacker.getAttackerDice();
  $("#attacker-dice").val( attackerDice );

  var defender =
    new Army(
      $("#defender-infantry").val(),
      $("#defender-cavalry").val(),
      $("#defender-artillery").val()
    );

  var defenderDice = defender.getDefenderDice();
  $("#defender-dice").val( defenderDice );

  if( attackerDice > 0 && defenderDice > 0 )
  { $("#calculatebutton").attr( "disabled", false ); }
  else
  { $("#calculatebutton").attr( "disabled", "disabled" ); }

  if( hasAttackerArtillery || parseInt( $("#defender-artillery").val() ) > 0 )
  { $(".noprebattle").attr( "disabled", false ); }
  else
  { $(".noprebattle").attr( "disabled", "disabled" ); }

}

function clearResults() {
  $("#results-table :input").css( "background", "" );
}

function resetForm() {
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

function indent( level=0, label='' ) {
  var result = '';
  for( var i=0; i<label.length; i++ ) {
    result += ' ';
  }

  for( var i=0; i<level; i++) {
    result += '  ';
  }
  return result;
}

function debug( text, level=0 ) {
  if( DEBUG ) {
    console.log( indent(level) + text );
  }
}

$(document).ready( function () {
  $('.dice-modifier').bind( 'change', function() {
    clearResults();
    update();
  } );
  resetForm();

} );

