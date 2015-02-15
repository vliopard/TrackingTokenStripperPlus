var isOn = false;
var isCk = false;
var list = new Array();
function isEnable()
{
	chrome.storage.sync.get({
		on: false,
		check: false
	}, function(items) {
			isOn = items.on;
			isCk = items.check;
		});
}
function setState()
{
	isOff = !isOn;
	chrome.storage.sync.set({
		on: isOn,
		off: isOff,
		check: isCk
	});
}
function getTokens()
{
	chrome.storage.sync.get({
		tokns: 'abc'
	}, function(items) {
			list = items.tokns;
		});
}
chrome.browserAction.onClicked.addListener(function() {	
	isEnable();
	isOn = !isOn;
	if (isOn)
	{
		chrome.browserAction.setIcon({path:"icon-48.png"});
	}
	else
	{
		chrome.browserAction.setIcon({path:"icon-48r.png"});
	}
	setState();
	save_options();
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	isEnable();
	if ( isOn == false ) return;
	getTokens();
	var stripped = tab.url;
    var queryStringIndex = tab.url.indexOf('?');
    if (( tab.url.indexOf('utm_') > queryStringIndex ) && ( isCk )) {
        stripped = tab.url.replace(
            /([\?\&]utm_(src|source|medium|term|campaign|content|cid|reader)=[^&#]+)/ig,
            '');
        if (stripped.charAt(queryStringIndex) === '&') {
            stripped = stripped.substr(0, queryStringIndex) + '?' +
                stripped.substr(queryStringIndex + 1)
        }
        if (stripped != tab.url) {
            chrome.tabs.update(tab.id, {url: stripped});
        }
    }
	var i;
	var qIndex;
	if ( list.length == 0 )
	{
		list = [ "?ocid=socialflow_facebook", "?fb_action_ids", "?bffb", "?ref=fb", "?spref=fb", "?cid=fbs", "?ref=tn_tn", "?CMP=fb", "?fb_comment_id", "?mb=fb", "?notif_t=like", "?cmpid=\"facefolha\"" ];
	}
	for ( i=0; i<list.length; i++ )
	{
		qIndex = stripped.indexOf(list[i]);
		if (qIndex > 0)
		{
			stripped=stripped.substr(0,qIndex)
		}
	}	
	if (stripped != tab.url) {
		chrome.tabs.update(tab.id, {url: stripped});	
	}
});
