$(function(){
	$(document).on('click',".cententDiv img",function(){
        var imgsrc = $(this).attr("src");
        var opacityBottom = '<div class="opacityBottom" style = "display:none"><img class="bigImg" src="' + imgsrc + '"></div>';
        $(document.body).append(opacityBottom);
        toBigImg();//变大函数
	})
})

const client = AgoraRTM.createInstance('ca131847690b49f1998d06530cb0cc74');//设置全局clientID

/**
	回调函数 => ConnectionStateChanged();
	监听SDK连接状态改变通知。
*/
client.on('ConnectionStateChanged', (newState, reason) => {
  // console.log('监听ConnectionStateChanged事件、获得SDK链接状态改变通知 ' + newState + ' reason: ' + reason);
  try{
		if(newState == 'CONNECTED'){
		  	if(reason == 'LOGIN_SUCCESS'){
		  		ConnectionStateChanged({status:200,msg:'用户登录成功'})
		  		return ;
		  	}else if(reason == 'MemberLeft'){
		  		ConnectionStateChanged({status:404,msg:'对方掉线30秒'})
		  		return ;
		  	}else if(reason == 'MemberJoined'){
		  		ConnectionStateChanged({status:404,msg:'对方掉线30秒后从新登录'})
		  		return ;
		  	}
		}else if(newState == 'DISCONNECTED'){
		  	if(reason == 'LOGIN_FAILURE'){
		  		ConnectionStateChanged({status:500,msg:'登录失败原因未知！'})
		  		return ;
		  	}else{
		  		ConnectionStateChanged({status:400,msg:'登录超时，6 秒内未能登录系统，正在重新登录'})
		  		return ;
		  	}
		}else if(newState == 'RECONNECTING'){
		  		ConnectionStateChanged({status:400,msg:'SDK 系统的链接状态中断超过14秒'})
		  		return ;
		}else if(newState == 'ABORTED'){
		  		ConnectionStateChanged({status:500,msg:'此用户ID被其它人顶掉'})
		  		return ;
		}
  }catch(e){
  	console.log('ConnectionStateChanged=函数不存在',e)
  }
});

/**
	登录 => 回调 
	login('小郭').then(res=>{}).catch(err=>{})
*/
function login(userid) {
	return new Promise((resolve,reject) =>{
		client.login({ token: null, uid: userid }).then(() => {
  			resolve('登录成功')
		}).catch(err => {
		  	reject({msg:'登录失败',error:err})
		});
	})
}

/**
	退出登录 回调
	loginout().then(res =>{})
*/
function promisefun(res) {
    return new Promise(resolve => {
        resolve(res)
    });
}
async function loginout(){
	await client.logout();
	promisefun('退出成功');
}

/**
	发送点对点 实时消息
	1.符合 RtmMessage 接口的参数对象
*/
function pushMessage(peerId,text){
	return new Promise((resolve,reject) =>{
		client.sendMessageToPeer({ text: text },peerId,).then(sendResult => {
		  if (sendResult.hasPeerReceived) {
		    /* 远端用户收到消息的处理逻辑 */
		    console.log('远端用户收到消息的处理逻辑',sendResult)
		    resolve(sendResult)
		  } else {
		    /* 服务器已接收、但远端用户不可达的处理逻辑 */
		    console.log('服务器已接收、但远端用户不可达的处理逻辑',sendResult)
		    resolve(sendResult)
		  }
		}).catch(error => {
		  /* 发送失败的处理逻辑 */
		  console.log('发送消息失败',error)
		  reject(error)
		});
	})
}

/**
	发送点对点图片 实时消息
	必须为blob对象
*/
async function pushMessageImage(blob){
	const mediaMessage = await client.createMediaMessageByUploading(blob, {
     messageType: 'IMAGE',
     fileName: 'agora.jpg',
     description: 'send image',
     thumbnail: blob,
     // width: 100,
     // height: 200,
     // thumbnailWidth: 50,
     // thumbnailHeight: 200,
     })
	console.log('mediaMessage',mediaMessage)
	return await new Promise((resolve,reject) =>{

		client.sendMessageToPeer(mediaMessage,peerId,).then(sendResult => {
			console.log('图片消息发送成功,',mediaMessage)
			fileOrBlobToDataURL(blob, (res)=>{
				mediaMessage.base64 = res
				// console.log(res) @xls 转换成功~~~ 2020/9/15
				resolve(mediaMessage)
			})
		})




	}).catch(err =>{
		console.log('图片上传服务器失败',err)
		reject({status:444,msg:'图片发送失败',error:err})
	})
     
}

/**
	接收点对点消息
	接收格式：文字、图片、文件
*/
client.on('MessageFromPeer', async message => {
 	console.log('接收消息',message)
 	if(message.messageType === 'TEXT'){
 		pullMessageText(message)
 	}else if (message.messageType === 'IMAGE') {
	     const thumbnail = message.thumbnailData
	     // 获得了 thumbnail 的 Blob 对象，进行其他操作
	     const blob = await client.downloadMedia(message.mediaId)
	     // 获得了 Blob 对象，进行其他操作
	     fileOrBlobToDataURL(blob, function (dataurl){
		     // console.log('------收到得图片转换成图片---',dataurl)
		     $("#upimg").attr('src',dataurl)
		     var imgobj = {
		     	dataurl:dataurl,
		     	width:message.thumbnailWidth,
		     	height:message.thumbnailHeight,
		     }
		     pullMessageImage(imgobj)
		 })
	}else if (message.messageType === 'FILE') {
	     const thumbnail = message.thumbnailData
	     // 获得了thumbnail 的 Blob 对象，进行其他操作
	     const blob = await client.downloadMedia(message.mediaId)
	     // 获得了 Blob 对象，进行其他操作
	     fileOrBlobToDataURL(blob, function (dataurl){
		     // console.log('------【文件】收到得blob转换成base64---',dataurl)
		     var file = new File([dataurl],'111111',{type:'application/vnd.ms-excel;charset=utf-8'});
		     pullMessageFile(file)

		 })
	}
})

/**
	接收图片 将 Blob 对象转换为图片
*/
function fileOrBlobToDataURL(obj, cb){
	 var a = new FileReader()
	 a.readAsDataURL(obj)
	 a.onload = function (e){
	     cb(e.target.result)
	 }
}

/**
	1.订阅用户在线状态
	2.查看用户在线状态
	@parmas  peerId string[]
*/
function getStatusUser(peerId){
	return new Promise((resolve,reject) =>{
		client.subscribePeersOnlineStatus([peerId]).then(res =>{
			resolve(res)
		}).catch(err =>{
			reject(res)
		})
	})
}
client.on('PeersOnlineStatusChanged',(status) =>{
	userStatus(status)
})


/**
	动态生成日期
*/
function getDate(){
    var date = new Date();
    var Year    = date.getFullYear()
    var Month   = date.getMonth()+1;//月份
    var Angel   = date.getDate();//1-31
    var Hours   = date.getHours();//小时
    var Minutes = date.getMinutes();//分钟
    var timestr = Year +'年'+ Month +'月'+ Angel +'日/'+Hours+':'+Minutes ;
    return timestr ;
}


/**
	实时消息 生成html标签
	@parmas type == true 是自己。false着是对方
*/
function appendMessage(parmas){
    var htmlstr = ''
    if(parmas.is_time){
        htmlstr += '<p>'+getDate()+'</p>'
        parmasMessage.is_time = false ;
    }
    if(parmas.type){
    	htmlstr += '<li class="right_li">'
    }else{
    	htmlstr += '<li class="left_li">'
    }
    
    htmlstr += '<img class="touimg" src="'+parmas.tou+'">'
    htmlstr += '<div class="cententDiv">'
    

    if(parmas.type){
    	htmlstr += '<b>'+parmas.userId+'</b>'
    }else{
    	htmlstr += '<b>'+parmas.peerId+'</b>'
    }


    if(parmas.type_message == 'text'){
    	htmlstr += '<div>'+parmas.text+'</div>'
    }else if(parmas.type_message == 'image'){
    	htmlstr += '<img src='+parmas.text+' />'
    }



    htmlstr += '</div></li>'
    // console.log(htmlstr)
    return htmlstr;
}





/**
	图片放大浏览事件
*/
function toBigImg() {
    $(".opacityBottom").addClass("opacityBottom");//添加遮罩层
    $(".opacityBottom").show();
    $("html,body").addClass("none-scroll");//下层不可滑动
    $(".bigImg").addClass("bigImg");//添加图片样式
    $(".opacityBottom").click(function () {//点击关闭
        $("html,body").removeClass("none-scroll");
        $(".opacityBottom").remove();
    });
}