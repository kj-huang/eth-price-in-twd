// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
chrome.browserAction.onClicked.addListener(function(tab) {
  // Send a message to the active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
  });
});

window.onload = getEthInNTDValue;

function freshPrice(){
  $("#value").text( " "+($("#eth-value").text() * $("#usd-to-ntd-value").text()).toFixed(2) ) ;
  setInterval(freshPrice, 0);
}

function getEthInNTDValue() {
    freshPrice();
    getETHValue();
    getUSDToNTDValue(); 
}


function getETHValue(){
  $.ajax({
    url:"https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=BTC,USD,EUR",
    type:"GET",
    dataType:"json",
    contentType: "application/json",
    success: function(response){
      return response;
    },
    error:function(res){
        console.log("Bad thing happend! " + res.statusText);
    }
 }).done(function( data ) {
      var x = data["USD"];
      $("#eth-value").text(x.toFixed(2));
  });;
  setInterval(getETHValue, 1000 * 3);
}

function getUSDToNTDValue(){
  $.ajax({
    url:"https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20csv%20where%20url%3D%27http%3A%2F%2Fdownload.finance.yahoo.com%2Fd%2Fquotes.csv%3Fe%3D.csv%26f%3Dc4l1%26s%3DUSDTWD%3Dx%27&format=json&callback=",
    type:"GET",
    dataType:"json",
    contentType: "application/json",
    success: function(response){
      return response;   
    },
    error:function(res){
        console.log("Bad thing happend! " + res.statusText);
    }
 }).done(function( data ) {
    var x = data["query"]["results"]["row"]["col1"];
    $("#usd-to-ntd-value").text(parseFloat(x).toFixed(2));
  });
  setInterval(getUSDToNTDValue, 1000 * 60 * 10);
}



