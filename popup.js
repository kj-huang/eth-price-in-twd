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
}

function getEthInNTDValue() {
  setInterval(function(){
    freshPrice();
    getETHValue();
    getUSDToNTDValue(); 
  }, 3000);
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
  // setInterval(getETHValue, 3000);
}

function getUSDToNTDValue(){
  $.ajax({
    url:"http://apilayer.net/api/live?access_key=849f238b1ed8d122d60ed6ddfba79e19&currencies=TWD&source=USD&format=1",
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
    var x = data["quotes"]["USDTWD"];
      $("#usd-to-ntd-value").text(x.toFixed(2));
  });
}



