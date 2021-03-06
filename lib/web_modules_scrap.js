module.exports = function() {

	var NWM = 'NWM'
		, GH_API = 'https://api.github.com/repos/'
		, NPM_API = 'http://registry.npmjs.org/'
		, CACHED_MODULES = []
	;

	var request = require('request')
		, moment = require('moment')
		, path = require('path')
		, url = require('url')
		, _ = require('underscore')
		, redis = require('./redis_connect')()
		, modules = require('./../modules.json')
	;

	return {
		update: function() {
			redis.flushdb(function(err, success) {
				if(err) console.log(err);
				if(success) console.log('Clear DB Keys');
				console.log('Clear Cache Memory');
				CACHED_MODULES = [];
			});
			
			console.log("Updating web modules...");

			_.each(modules, function(gh_module_name, npm_module_name){
				var gh_module_url = GH_API + gh_module_name;
				var npm_module_url = NPM_API + npm_module_name + '/latest';

				request({url: gh_module_url, json:true}, function(err, res, grepo) {
					request({url: npm_module_url, json:true}, function(err, res, nrepo) {
						console.log("Receive: %j\n%j\n", grepo, nrepo);
						
						var data = JSON.stringify({
								name: npm_module_name
							, gh_url: grepo.html_url
							, npm_url: 'https://npmjs.org/package/' + npm_module_name
							, version: nrepo.version
							, image: 'images/' + npm_module_name + '.png'
							, site: url.resolve('http://', grepo.homepage)
							, created_at: moment(grepo.created_at).fromNow()
							, author: nrepo._npmUser.name
							, author_npm: 'https://npmjs.org/~' + nrepo._npmUser.name
							, forks: grepo.forks_count
							, watchers: grepo.watchers
							, issues: grepo.open_issues
							, description: grepo.description
							, install: 'npm install ' + npm_module_name
						});
					
						redis.zadd(NWM, grepo.watchers, data, function() {
							console.log("%j\n-------------\n", data);
						});
					});
				});
			});
		},

		get: function(done) {
			if(CACHED_MODULES && CACHED_MODULES.length) {
				// Memory Render
				console.log('Memory render');
				return done(CACHED_MODULES)
			} else {
				redis.zrevrange(NWM, 0, -1, function(err, modules) {
					// Redis Render
					console.log('Redis render');
					var max = modules.length
					for(var i = 0; i < max; i++) {
						CACHED_MODULES[i] = JSON.parse(modules[i]);
					}
					return done(CACHED_MODULES);
				});	
			}
		}
	}
}