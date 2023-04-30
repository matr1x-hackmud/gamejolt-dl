"use strict"

async function main(){
	let START = Date.now()

	const request = require("request")
	const proc = require("process")
	const wget = require('node-wget')
	const clargs = require('command-line-args')
	const fs = require('fs');
	const path = require('path')
	
	const opts = [
	  { name: 'search', alias: 's', type: String },
	  { name: 'all', alias: 'a', type: Boolean}
	]

	let ARGS = clargs(opts)
	
	let SEARCH_TERM = ARGS.search,
	ALL_GAMES = (ARGS.all ? true : false)
	
	if(!SEARCH_TERM || typeof SEARCH_TERM == "undefined"){
		return console.log("node index.js -s \"search term\" --all")
	}

	const API = {
		domain_root: "gamejolt.com",
		GET: (endpoint) => {
			return new Promise((resolve, reject) => {
				request({
					method: "GET",
					uri: "https://"+API.domain_root+"/site-api/web/"+endpoint
				}, (error, response, body) => {
					if (!error && response.statusCode === 200) {
						resolve(body)
					} else {
						reject({
							error: error,
							statusCode: response ? response.statusCode : null,
							body: body
						})
					}
				})
			})
		},
		POST: (endpoint, dat) => {
			return new Promise((resolve, reject) => {
				request({
					method: "POST",
					uri: "https://"+API.domain_root+"/site-api/web/"+endpoint,
					json: dat
				}, (error, response, body) => {
					if (!error && response.statusCode === 200) {
						resolve(body)
					} else {
						reject({
							error: error,
							statusCode: response ? response.statusCode : null,
							body: body
						})
					}
				})
			})
		},
		search: (s_term, page) => API.GET("search/games?q="+s_term+"&page="+page),
		discover: game_id => API.GET("discover/games/overview/"+game_id),
		get_build_url: build => API.POST("discover/games/builds/get-download-url/"+build, {forceDownload:true})
	}

	console.log("=======")
	console.log("")
	console.log("gamejolt-dl")
	console.log("by marto")
	console.log("")
	console.log("WARNING: probably doesn't work well")
	console.log("WARNING: this will also DL literal gigabytes of crap")
	console.log("WARNING: you might also get your IP banned from gamejolt")
	console.log("")
	console.log("=======")
	console.log("")
	console.log("SEARCH TERM: "+SEARCH_TERM)
	
	SEARCH_TERM = encodeURIComponent(SEARCH_TERM)

	let api_ret = await API.search(SEARCH_TERM, 1).then(_ => JSON.parse(_)).catch(_ => JSON.parse(_))

	let game_count = api_ret.payload.gamesCount,
	games_per_page = api_ret.payload.perPage,
	pages = Math.ceil(game_count / games_per_page)

	console.log("Found "+game_count+" games with that search term across "+pages+" pages")
	console.log("Scraping each page...")

	let games = []

	for(let P = 1; P <= pages; P++){	
		let search_page = await API.search(SEARCH_TERM, P).then(_ => JSON.parse(_)).catch(_ => JSON.parse(_))
		
		search_page = search_page.payload.games.filter(g => (ALL_GAMES ? true : (g.compatibility.os_windows || g.compatibility.os_windows_64) ) ) 
		// only scrape free games
		// also only download windows builds if not set to ALL_GAMES
		
		games.push(...search_page.map(g =>{ return {i:g.id, t:g.title, d:g.developer.username, c:g.compatibility } } ))
	}

	console.log(games.length + " game IDs grabbed")
	console.log("")
	console.log("----------")
	console.log("")
	
	let inc = 1
	
	game_loop:
	for(let game of games){
		console.log("["+inc+"] Game ID "+game.i.toString().padEnd(7," ")+" | "+game.t)
		console.log("["+inc+"] Querying discover API...")
		
		try {
			let game_detail = await API.discover(game.i)
			game_detail = JSON.parse(game_detail)

			console.log("["+inc+"] Obtained game details")

			let builds = game_detail.payload.builds.filter(b => b && typeof b == "object" && (ALL_GAMES ? true : b.os_windows || b.os_windows_64))

			if(!builds.length){
				console.error("["+inc+"] No builds found for "+game.i)
				console.log("")
				inc++
				continue game_loop
			}
			else{
				let newest_build = builds[0]
				
				try{
					let DL_link = await API.get_build_url(newest_build.id),
					folder_name = ""+game.i+" - "+game.t.replace(/[/\\?%*:|"<>]/g, '+')
					
					if(!fs.existsSync("./"+folder_name)) fs.mkdirSync("./"+folder_name)
					
					wget({
						url:DL_link.payload.url,
						dest:"./"+folder_name+"/"
					})
					
					console.log("["+inc+"] DOWNLOADED: "+game.t)
					console.log("")
					inc++
					continue game_loop
				}
				catch(e){
					console.error("["+inc+"] ID "+game.i+" has a build, but we couldn't download it!")
					inc++
					continue game_loop
				}
			}
		  
		  
        }
        catch(e) {
            console.error("["+inc+"] Failed to obtain game details for "+game.i+"!")
            console.log("")
			console.error(e)
            inc++
			continue game_loop
        }
		
	}
	
	console.log("")
	console.log("----------")
	console.log("")
	console.log("All games with your search term have been downloaded!")
	console.log("My condolences to your hard drive")
}

main()