import fs from 'fs'
import checkbox from '@inquirer/checkbox';
import got from 'got';

var songs = [];
var songsMap = {};
const songName = process.argv[2];
const fetchSize = process.argv[3] == null ? 10 : process.argv[3];
if (songName == null || songName == '') {
	console.log('输入歌名');
	process.exit(1);
}


const options = {
	"headers": {
		'Host': 'music.163.com',
		'Connection': 'keep-alive',
		'Content-Type': "application/x-www-form-urlencoded; charset=UTF-8",
		'Referer': 'https://music.163.com/',
		"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.152 Safari/537.36"
	}
}
const data = await got(`https://music.163.com/api/search/get/web?s=${encodeURIComponent(songName)}&type=1&limit=${fetchSize}&offset=0`, options).json();
// #  type搜索单曲(1)，歌手(100)，专辑(10)，歌单(1000)，用户(1002) *(type)*

if (data && data.result && data.result.songCount > 0) {
	var songIds = [];
	data.result.songs.forEach(s => {
		songsMap[s.id] = { name: `${s.name} - ${s.artists[0].name}`, url: null };
		songIds.push(s.id);
	});
	const songDetail = await got(`https://music.163.com/api/song/enhance/player/url?ids=[${songIds.join(',')}]&br=6400000`, options).json();
	if (songDetail && songDetail.data && songDetail.data.length > 0) {
		songDetail.data.forEach(s => {
			var time = s.time / 1000;
			var size = s.size / 1024 / 1024;
			time = Math.round(time / 60).toString().padStart(2, '0') + ':' + Math.round(time % 60).toString().padStart(2, '0');
			songs.push({
				size: size,
				name: ` ${time}  ${size.toFixed(2)}MB\t${songsMap[s.id].name}`,
				value: s.id
			});
			songsMap[s.id].url = s.url;
		});
	}
} else {
	console.log('没有找到歌曲');
	process.exit(1);
}
songs.sort((a, b) => b.size - a.size);

const answer = await checkbox({
	message: '选择歌曲 ',
	choices: songs,
	instructions: '<空格>选择, <a>全选, <i>全不选, <回车>确认',
	pageSize: 10,
	loop: false,
});
// download
for (var i = 0; i < answer.length; i++) {
	var s = songsMap[answer[i]];
	try {
		got.stream(s.url).pipe(fs.createWriteStream(`/data/data/com.termux/files/home/storage/shared/Music/${s.name}.${s.url.split(".").pop()}`));
		console.log(`下载完成: ${s.name}`);
	} catch (e) {
		console.error(e);
	}
}
