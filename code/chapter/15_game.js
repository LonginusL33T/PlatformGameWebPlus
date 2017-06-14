var simpleLevelPlan = [
  "                      ",
  "                      ",
  "  x              = x  ",
  "  x         o o    x  ",
  "  x @      xxxxx   x  ",
  "  xxxxx            x  ",
  "      x!!!!!!!!!!!!x  ",
  "      xxxxxxxxxxxxxx  ",
  "                      "
];
//初始积分为0
var mark = 0;
//var lusername = document.getElementById("lusername").value;
var cs;
var cu;
var ddmark;
var trigger;




function Level(plan) {
  this.width = plan[0].length;
  this.height = plan.length;
  this.grid = [];
  this.actors = [];

  for (var y = 0; y < this.height; y++) {
    var line = plan[y], gridLine = [];
    for (var x = 0; x < this.width; x++) {
      var ch = line[x], fieldType = null;
      var Actor = actorChars[ch];
      if (Actor)
        this.actors.push(new Actor(new Vector(x, y), ch));
      else if (ch == "x")
        fieldType = "wall";
      else if (ch == "!")
        fieldType = "lava";
      gridLine.push(fieldType);
    }
    this.grid.push(gridLine);
  }

  this.player = this.actors.filter(function(actor) {
    return actor.type == "player";
  })[0];
  this.status = this.finishDelay = null;
}

Level.prototype.isFinished = function() {
  return this.status != null && this.finishDelay < 0;
};

function Vector(x, y) {
  this.x = x; this.y = y;
}
Vector.prototype.plus = function(other) {
  return new Vector(this.x + other.x, this.y + other.y);
};
Vector.prototype.times = function(factor) {
  return new Vector(this.x * factor, this.y * factor);
};

var actorChars = {
  "@": Player,
  "o": Coin,
  "=": Lava, "|": Lava, "v": Lava
};

function Player(pos) {
  this.pos = pos.plus(new Vector(0, -0.5));
  this.size = new Vector(0.8, 1.5);
  this.speed = new Vector(0, 0);
}
Player.prototype.type = "player";

function Lava(pos, ch) {
  this.pos = pos;
  this.size = new Vector(1, 1);
  if (ch == "=") {
    this.speed = new Vector(2, 0);
  } else if (ch == "|") {
    this.speed = new Vector(0, 2);
  } else if (ch == "v") {
    this.speed = new Vector(0, 3);
    this.repeatPos = pos;
  }
}
Lava.prototype.type = "lava";
//硬币
function Coin(pos) {
  this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
  this.size = new Vector(0.6, 0.6);
  this.wobble = Math.random() * Math.PI * 2;
}
Coin.prototype.type = "coin";

var simpleLevel = new Level(simpleLevelPlan);

function elt(name, className) {
  var elt = document.createElement(name);
  if (className) elt.className = className;
  return elt;
}

function DOMDisplay(parent, level) {
  this.wrap = parent.appendChild(elt("div", "game"));
  this.level = level;

  this.wrap.appendChild(this.drawBackground());
  this.actorLayer = null;
  this.drawFrame();
}

var scale = 20;

DOMDisplay.prototype.drawBackground = function() {
  var table = elt("table", "background");
  table.style.width = this.level.width * scale + "px";
  this.level.grid.forEach(function(row) {
    var rowElt = table.appendChild(elt("tr"));
    rowElt.style.height = scale + "px";
    row.forEach(function(type) {
      rowElt.appendChild(elt("td", type));
    });
  });
  return table;
};

DOMDisplay.prototype.drawActors = function() {
  var wrap = elt("div");
  this.level.actors.forEach(function(actor) {
    var rect = wrap.appendChild(elt("div",
                                    "actor " + actor.type));
    rect.style.width = actor.size.x * scale + "px";
    rect.style.height = actor.size.y * scale + "px";
    rect.style.left = actor.pos.x * scale + "px";
    rect.style.top = actor.pos.y * scale + "px";
  });
  return wrap;
};

DOMDisplay.prototype.drawFrame = function() {
  if (this.actorLayer)
    this.wrap.removeChild(this.actorLayer);
  this.actorLayer = this.wrap.appendChild(this.drawActors());
  this.wrap.className = "game " + (this.level.status || "");
  this.scrollPlayerIntoView();
};

DOMDisplay.prototype.scrollPlayerIntoView = function() {
  var width = this.wrap.clientWidth;
  var height = this.wrap.clientHeight;
  var margin = width / 3;

  // The viewport
  var left = this.wrap.scrollLeft, right = left + width;
  var top = this.wrap.scrollTop, bottom = top + height;

  var player = this.level.player;
  var center = player.pos.plus(player.size.times(0.5))
                 .times(scale);

  if (center.x < left + margin)
    this.wrap.scrollLeft = center.x - margin;
  else if (center.x > right - margin)
    this.wrap.scrollLeft = center.x + margin - width;
  if (center.y < top + margin)
    this.wrap.scrollTop = center.y - margin;
  else if (center.y > bottom - margin)
    this.wrap.scrollTop = center.y + margin - height;
};

DOMDisplay.prototype.clear = function() {
  this.wrap.parentNode.removeChild(this.wrap);
};

Level.prototype.obstacleAt = function(pos, size) {
  var xStart = Math.floor(pos.x);
  var xEnd = Math.ceil(pos.x + size.x);
  var yStart = Math.floor(pos.y);
  var yEnd = Math.ceil(pos.y + size.y);

  if (xStart < 0 || xEnd > this.width || yStart < 0)
    return "wall";
  if (yEnd > this.height)
    return "lava";
  for (var y = yStart; y < yEnd; y++) {
    for (var x = xStart; x < xEnd; x++) {
      var fieldType = this.grid[y][x];
      if (fieldType) return fieldType;
    }
  }
};

Level.prototype.actorAt = function(actor) {
  for (var i = 0; i < this.actors.length; i++) {
    var other = this.actors[i];
    if (other != actor &&
        actor.pos.x + actor.size.x > other.pos.x &&
        actor.pos.x < other.pos.x + other.size.x &&
        actor.pos.y + actor.size.y > other.pos.y &&
        actor.pos.y < other.pos.y + other.size.y)
      return other;
  }
};

var maxStep = 0.05;

Level.prototype.animate = function(step, keys) {
  if (this.status != null)
    this.finishDelay -= step;

  while (step > 0) {
    var thisStep = Math.min(step, maxStep);
    this.actors.forEach(function(actor) {
      actor.act(thisStep, this, keys);
    }, this);
    step -= thisStep;
  }
};

Lava.prototype.act = function(step, level) {
  var newPos = this.pos.plus(this.speed.times(step));
  if (!level.obstacleAt(newPos, this.size))
    this.pos = newPos;
  else if (this.repeatPos)
    this.pos = this.repeatPos;
  else
    this.speed = this.speed.times(-1);
};

var wobbleSpeed = 8, wobbleDist = 0.07;

Coin.prototype.act = function(step) {
  this.wobble += step * wobbleSpeed;
  var wobblePos = Math.sin(this.wobble) * wobbleDist;
  this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

var playerXSpeed = 7;

Player.prototype.moveX = function(step, level, keys) {
  this.speed.x = 0;
  if (keys.left) this.speed.x -= playerXSpeed;
  if (keys.right) this.speed.x += playerXSpeed;

  var motion = new Vector(this.speed.x * step, 0);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle)
    level.playerTouched(obstacle);
  else
    this.pos = newPos;
};

var gravity = 30;
var jumpSpeed = 17;

Player.prototype.moveY = function(step, level, keys) {
  this.speed.y += step * gravity;
  var motion = new Vector(0, this.speed.y * step);
  var newPos = this.pos.plus(motion);
  var obstacle = level.obstacleAt(newPos, this.size);
  if (obstacle) {
    level.playerTouched(obstacle);
    if (keys.up && this.speed.y > 0)
      this.speed.y = -jumpSpeed;
    else
      this.speed.y = 0;
  } else {
    this.pos = newPos;
  }
};

Player.prototype.act = function(step, level, keys) {
  this.moveX(step, level, keys);
  this.moveY(step, level, keys);

  var otherActor = level.actorAt(this);
  if (otherActor)
    level.playerTouched(otherActor.type, otherActor);

  // Losing animation
  if (level.status == "lost") {
    this.pos.y += step;
    this.size.y -= step;
  }
};
//玩家碰撞事件
Level.prototype.playerTouched = function(type, actor) {
  if (type == "lava" && this.status == null) {
    this.status = "lost";
    this.finishDelay = 1;
  } else if (type == "coin") {
      mark = mark + 100;
      document.getElementById('b').innerHTML = mark;
      var ccmark = cs;
      var ccuser = cu;
      if(mark>ccmark){
          updateMark();
      }
    this.actors = this.actors.filter(function(other) {
      return other != actor;

    });
    if (!this.actors.some(function(actor) {
      return actor.type == "coin";
    })) {
      this.status = "won";
      this.finishDelay = 1;
    }
  }
};

//游戏操控方向对应键盘标号
var arrowCodes = {37: "left", 38: "up", 39: "right"};

function trackKeys(codes) {
  var pressed = Object.create(null);
  function handler(event) {
    if (codes.hasOwnProperty(event.keyCode)) {
      var down = event.type == "keydown";
      pressed[codes[event.keyCode]] = down;
      event.preventDefault();
    }
  }
  addEventListener("keydown", handler);
  addEventListener("keyup", handler);
  return pressed;
}

function runAnimation(frameFunc) {
  var lastTime = null;
  function frame(time) {
    var stop = false;
    if (lastTime != null) {
      var timeStep = Math.min(time - lastTime, 100) / 1000;
      stop = frameFunc(timeStep) === false;
    }
    lastTime = time;
    if (!stop)
      requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

var arrows = trackKeys(arrowCodes);

function runLevel(level, Display, andThen) {
  var display = new Display(document.body, level);
  runAnimation(function(step) {
    level.animate(step, arrows);
    display.drawFrame(step);
    if (level.isFinished()) {
      display.clear();
      if (andThen)
        andThen(level.status);
      return false;
    }
  });
}

function runGame(plans, Display,x ,y) {
    cs = x;
    cu = y;
  //初始生命设为3
    var life = 3;
  function startLevel(n) {
    runLevel(new Level(plans[n]), Display, function(status) {
      if (status == "lost") {
        //当状态置为“lost”时，life-1
          life = life - 1;
          alert("您当前剩余" + life + "次机会！");
          if (life > 0) {
              //剩余生命时从当前关卡开始
              startLevel(n);
          } else {
              //生命为0时直接从起始关开始
              alert("游戏结束！");
              //alert(mark);
              mark = 0;
              startLevel(0);
          }
      }
      else if (n < plans.length - 1)
        startLevel(n + 1);
      else
        console.log("You win!");
    });
  }
  startLevel(0);
}




document.onkeydown=function(event){
                 var e = event || window.event || arguments.callee.caller.arguments[0];
                 if(e && e.keyCode==27){
                     alert("如要继续游戏，请按下确定");
                       }
            };



document.onkeyup = function (event) {
    var e = event || window.event;
    var keyCode = e.keyCode || e.which;
    switch (keyCode) {
        case 37:
            $("#btnLeft").click();
            break;
        case 38:
            $("#btnUp").click();
            break;
        case 39:
            $("#btnRight").click();
            break;
        default:
            break;
    }
};

//access


updateMark = function(){
    //$("#score_form").submit();
    //alert(cs);
    //alert(cu);
    //alert(mark);
    $.ajax({
        type: "GET",
        url: "http://kirkcola.com/electronserver?",
        data: {
            session: "wcc",
            action: "update",
            score: mark,
            user: cu,
        },
        async: false,
        error: function (request) {
            alert("Connection error");
        },
        success:function(data){
            if(data.status=="success")
            {
                //alert("修改成功");
                return true;
            }

        },
    });

};

//查询
function queryUser() {
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var rs = new ActiveXObject("ADODB.Recordset");
    var sql = "select * from User";
    rs.open(sql, conn);
    var html = "";
    while (!rs.EOF) {
        html = html + rs.Fields("ID") + " " + rs.Fields("name") + " " + rs.Fields("password") + " " + rs.Fields("mark");
        rs.moveNext();
    }
    document.write(html);
    rs.close();
    rs = null;
    conn.close();
    conn = null;
}

//查询当前用户对应积分
function queryUserMark(name) {
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var rs = new ActiveXObject("ADODB.Recordset");
    var sql = "select * from User where name='" + name + "'";
    rs.open(sql, conn);
    var cmark = "";
    cmark = cmark + rs.Fields("mark");
    //document.write(html);
    rs.close();
    rs = null;
    conn.close();
    conn = null;
     //alert(cmark);

     return cmark;
}





 //增添用户
function addUser(name,password,mail)
{
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var sql="insert into User(name,password,mail) values('"+name+"','"+password+"','"+mail+"')";
    try{
        conn.execute(sql);
        alert("注册成功");
    }
    catch(e){
        document.write(e.description);
        alert("添加失败~~~");
    }
    conn.close();
}







//登陆验证
function verifyUser(name,password)
{
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//Apache//htdocs//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var rs = new ActiveXObject("ADODB.Recordset");
    var sql="select * from User where name='" + name + "' and password='" + password + "'";
    rs.open(sql, conn);
     if(rs.Fields("password")==password){
        return true;
    }
    else{
        alert("用户名或密码错误");
        return false;
    }
}



//注册验证
function verifyrUser(name)
{
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var rs = new ActiveXObject("ADODB.Recordset");
    var sql="select * from User where name='" + name + "'";
    rs.open(sql, conn);
    if(rs.Fields("name")!=name){
        return true;
    }
    else{
        alert("该用户已存在");
        return false;
    }
}



//删除
function del(id)
{
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var sql="delete from  where Id=7";
    conn.execute(sql);
    conn.close();
    conn = null;
    alert("修改成功");
}



//修改
function updateUser(name,mark)
{
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var rs = new ActiveXObject("ADODB.Recordset");
    var sql="update  User set mark='" + mark + "' where name='" + name + "'";
    conn.execute(sql);
    conn.close();
    conn = null;
}

function displayFirst()
{
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var rs = new ActiveXObject("ADODB.Recordset");
    var sql="select * from User order by mark DESC";
    rs.open(sql, conn);
    var html="";
    var  i  =1;
    while(!rs.EOF)
    {
        html=html+"第"+i+"名"+'<br>';
        i=i+1;
        rs.moveNext();

    }
    document.write(html);
    rs.close();
    rs = null;
    conn.close();
    conn = null;
}


function displayName()
{
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var rs = new ActiveXObject("ADODB.Recordset");
    var sql="select * from User order by mark DESC";
    rs.open(sql, conn);
    var html="";
    while(!rs.EOF)
    {
        html=html+"&nbsp;&nbsp;&nbsp;&nbsp;"+rs.Fields("name")+'<br>';
        rs.moveNext();

    }
    document.write(html);
    rs.close();
    rs = null;
    conn.close();
    conn = null;
}

function displayMark()
{
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var rs = new ActiveXObject("ADODB.Recordset");
    var sql="select * from User order by mark DESC";
    rs.open(sql, conn);
    var html="";
    while(!rs.EOF)
    {
        html=html+rs.Fields("mark")+"分"+'<br>';
        rs.moveNext();

    }
    document.write(html);
    rs.close();
    rs = null;
    conn.close();
    conn = null;
}

/*
function displayMark()
{
    var conn = new ActiveXObject("ADODB.Connection");
    conn.Open("DBQ=D://Software//JS//PlatformGame//app//PlatformGame.mdb;DRIVER={Microsoft Access Driver (*.mdb)};");
    var rs = new ActiveXObject("ADODB.Recordset");
    var sql="select * from User order by mark DESC";
    rs.open(sql, conn);
    var html="";
    var i=1;
    while(!rs.EOF)
    {
        html=html+"第"+i+"名"+"&nbsp;"+rs.Fields("name")+"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"+rs.Fields("mark")+"分"+'<br>';
        i = i + 1;
        rs.moveNext();

    }
    document.write(html);
    rs.close();
    rs = null;
    conn.close();
    conn = null;
}
*/
//access















