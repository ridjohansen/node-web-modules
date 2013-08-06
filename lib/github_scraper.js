module.exports = function() {
	var request = require('request')
		, url = require('url')
		, cronJob = require('cron').CronJob
		, redis = require('./redis_connect')()
		, frameworks = require('./../web_frameworks.json')
	;
		
	var job = new cronJob({
			cronTime: '00 00 01 * * *'
		, onTick: function() {
				console.log("Running github scraper");
				for(var fw in frameworks) {
					request.get(frameworks[fw].github, function(err, res, repo) {
						request.get(frameworks[fw].github + '/contributors', function(err, res, contributors) {
							var data = JSON.stringify({
									repo_url: repo.html_url
								, repo_image: frameworks[fw].image
								, repo_site: repo.homepage
								, created_at: repo.created_at
								, author: repo.owner.login
								, author_url: repo.owner.html_url
								, author_image: repo.owner.avatar_url
								, forks: repo.forks_count
								, watchers: repo.watchers
								, issues: repo.open_issues
								, contributors: contributors.length
								, description: repo.description
							});
							
							redis.zadd("nwf", repo.watchers, data, function() {
								console.log("Storing: %s", data);
							});
						});
					});
				}
		  }
		,	start: false
	});
	
	job.start();
}