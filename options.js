function save_options() {
	var list = new Array();
	var len = document.getElementById('ignore').options.length;
	var ign = document.getElementById('ignore');
	for ( i = 0; i < len; i++ )
	{
		list[i] = ign.options[i].text;
	}
	var disabled = document.getElementById('0').checked;
	var enabled = document.getElementById('1').checked; 
	var gcamp = document.getElementById('ck').checked;
	if (enabled)
	{
		chrome.browserAction.setIcon({path:"icon-48.png"});
	}
	else
	{
		chrome.browserAction.setIcon({path:"icon-48r.png"});
	}
	chrome.storage.sync.set({
		on: enabled,
		off: disabled,
		check: gcamp,
		tokns: list
	}, function() {
		var status = document.getElementById('msg');
		status.textContent = "      Saved     ";
		setTimeout(function() {
					status.textContent = '                ';
					}, 850);
		});
}
function restore_options() {
	chrome.storage.sync.get({
		on: true,
		off: false,
		check: true,
		tokns: [ "?ocid=socialflow_facebook", "?fb_action_ids", "?bffb", "?ref=fb", "?spref=fb", "?cid=fbs", "?ref=tn_tn", "?CMP=fb", "?fb_comment_id", "?mb=fb", "?notif_t=like", "?cmpid=\"facefolha\"" ]
	}, function(items) {
			document.getElementById('0').checked = items.off;
			document.getElementById('1').checked = items.on;
			document.getElementById('ck').checked = items.check;
			var len = document.getElementById('ignore').options.length;
			var ign = document.getElementById('ignore');
			var tok = items.tokns;
			var i;
			var test;
			if (len == 1)
			{
				test = ign.options[0].text;
				if ( test.trim() == "")
				{
					ign.remove(0);
				}
			}
			for( i = 0; i < tok.length; i++ )
			{
				var opt = document.createElement("option");
				opt.text = tok[i];
				ign.add(opt);
			}
		});
}
function add() {	
	var len = document.getElementById('ignore').options.length;
	var ign = document.getElementById('ignore');
	var opt = document.createElement("option");
	var word = document.getElementById('add').value;
	var test;
	var i;
	word = word.toLowerCase().trim();
	if (word.length <= 1) return;
	document.getElementById('add').value='';
	for ( i = 0; i < len; i++)
	{
		var check = ign.options[i].text.toLowerCase().trim();
		if ( check == word )
		{
			document.getElementById('add').focus();
			return;
		}
	}
	if (len == 1)
	{
		test = ign.options[0].text;
		if ( test.trim() == "")
		{
			ign.remove(0);
		}
	}
	opt.text = word;
	ign.add(opt);
	save_options();
	document.getElementById('add').focus();
}
function remo() {
	var len = document.getElementById('ignore').options.length;
	var ign = document.getElementById('ignore');
	var i;	
	for ( i = len-1; i >= 0; i-- )
	{
		if ( ign.options[i].selected )
		{
			ign.remove(i);
		}
	}
	save_options();	
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('0').addEventListener('click', save_options);
document.getElementById('1').addEventListener('click', save_options);
document.getElementById('ck').addEventListener('click', save_options);
document.getElementById('addBtn').addEventListener('click', add);
document.getElementById('removeBtn').addEventListener('click', remo);
