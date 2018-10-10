(function(module) {
	'use strict';

	const User = module.parent.require('./user');
	const Topics = module.parent.require('./topics');
	const Categories = module.parent.require('./categories');
	const nconf = module.parent.require('nconf');
	const async = module.parent.require('async');

  const axios = require('axios');
  const forumURL = nconf.get('url');
  
  axios.defaults.headers.post['Content-Type'] = 'application/json; charset=utf-8';
  
  /* let config = {
      "postHook": "",
      "modHook": "",
      "modCategoryIds": [],
      "adminCategoryIds": []
    }; */

  const config = require('./config.json');
  const plugin = {};

	plugin.init = function(params, callback) {
		function render(req, res, next) {
			res.render('admin/plugins/discord-notification', {});
		}

		params.router.get('/admin/plugins/discord-notification', params.middleware.admin.buildHeader, render);
		params.router.get('/api/admin/plugins/discord-notification', render);

		callback();
	},

	plugin.postSave = function(post) {
		post = post.post;

    async.parallel({
      user: function(callback) {
        User.getUserFields(post.uid, ['username', 'picture'], callback);
      },
      topic: function(callback) {
        Topics.getTopicFields(post.tid, ['title', 'slug'], callback);
      },
      category: function(callback) {
        Categories.getCategoryFields(post.cid, ['name', 'bgColor'], callback);
      }
    }, function(_, data) {
      const url = `${forumURL}/topic/${data.topic.slug}`;
      const area = data.category.name;
      const title = data.topic.title;
      const username = data.user.username;

      const content = {
        content: "User: `" + username + "` Thread: `" + title + "` Area: `" + area + "`\nURL: <" + url + ">"
      };

      if (!config.adminCategoryIds.includes(post.cid)) {
        const hookUrl = config.modCategoryIds.includes(post.cid) ? config.modHook : config.postHook;
        axios.post(hookUrl, JSON.stringify(content));
      }
    });
	},

	plugin.adminMenu = function(headers, callback) {
    headers.plugins.push({
      route : '/plugins/discord-notification',
      icon  : 'fa-bell',
      name  : "RERN Discord"
    });

    callback(null, headers);
	};

	module.exports = plugin;

}(module));