<?php
  date_default_timezone_set('America/New_York');
  $data = array( date("Y-m-d H:i:s"), $_SERVER['REMOTE_ADDR'] );
  array_push( $data ); // , $_POST['name'], $_POST['time'] );

  $fh = fopen("results.log", 'a') or die("can't open file");
  fwrite($fh, implode('|', $data) . "\n" );
  fclose($fh);
?>
