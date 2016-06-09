// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkID=397704
// To debug code on page load in Ripple or on Android devices/emulators: launch your app, set breakpoints, 
// and then run "window.location.reload()" in the JavaScript Console.
(function () {
    "use strict";
    var canvas;
    var current_selection = null;
    var boardlist = null;
    var filereadcomplete = false;
    var offset = {};
    var previouspos = null;
    var canvasarray = [];
    var cstep = -1;
    var touchmove = false;
    var board = [];
    var choices = {
        img_r1c1: null,
        img_r1c2: null,
        img_r1c3: null,
        img_r2c1: null,
        img_r2c2: null,
        img_r3c1: null,
        img_r3c2: null
    };

    document.addEventListener( 'deviceready', onDeviceReady.bind( this ), false );

    function onDeviceReady() {
        // Handle the Cordova pause and resume events
        StatusBar.hide();
        AndroidFullScreen.immersiveMode(null, null);
        document.addEventListener( 'pause', onPause.bind( this ), false );
        document.addEventListener('resume', onResume.bind(this), false);
        screen.lockOrientation('portrait');
        
        /*Common handling of all the back/cancel buttons*/
        if ($("#back").length) {
            $("#back").click(function () { pageTransition('right', window.history.back()); });
        }

        /*Index Page - read the boards from local storage and create table to display*/
        if ($("#indexpg").length) {
            readfile("res/boardlist.txt");
            var time = setInterval(function () {
                if (filereadcomplete == true) {
                    displayBoardList();
                    clearInterval(time);
                }
            }, 500);

            /*Handle the button to add a new board*/
            if ($("#new_board_btn").length) {
                $("#new_board_btn").click(function () { pageTransition('left', 'newboardsetting.html'); });
            }

            $("#delete").click(function () {
                $("#deletealert").css('display', 'inline');
                setTimeout(function () {
                    $("#deletealert").css('display', 'none');
                }, 1000);
            });
            $("#info").click(function () { pageTransition('left', 'info.html'); });
        }

        /*New Board Setting page(Choose Display) - Event Listeners for all display choices*/
        if ($("#newboardsetting").length) {
            
            $("#oneby2").on('touchend', function () {
                saveConfiguration(this.id);
                pageTransition('left', 'board.html');
            });
            $("#oneby3").on('touchend',function () {
                saveConfiguration(this.id);
                pageTransition('left', 'board.html');
            });
            $("#twoby1").on('touchend', function () {
                saveConfiguration(this.id);
                pageTransition('left', 'board.html');
            });
            $("#twoby2").on('touchend', function () {
                saveConfiguration(this.id);
                pageTransition('left', 'board.html');
            });
            $("#threeby1").on('touchend', function () {
                saveConfiguration(this.id);
                pageTransition('left', 'board.html');
            });
            $("#threeby2").on('touchend', function () {
                saveConfiguration(this.id);
                pageTransition('left', 'board.html');
            });
        }

        /*Page for new Board being created*/
        if ($("#board").length) {
            readfile("res/board.txt");
            /*Read settings from local storage and create the new Board*/
            var timer = setInterval(function () {
                if (filereadcomplete == true) {
                    createNewBoard();
                    clearInterval(timer);
                }
            }, 500);
       
            /*handle the cancel button*/
            $("#back_btn").click(function () {
                var text = JSON.stringify(choices);
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory + "res", function (dir) {
                    dir.getFile("board.txt", { create: true }, function (f) {
                        f.createWriter(function (boardWriter) {

                            var blob = new Blob([text], { type: 'text/plain' });
                            boardWriter.write(blob);
                            boardWriter.onwriteend = function () {
                                pageTransition('right', window.history.back());
                            };

                        });
                    }, function (e) { JSON.stringify(e); });
                });
            });

            /*handle the save button*/
            $("#save").click(saveBoard);
        }

        /*ChoiceItem (Canvas) page*/
        if ($("#choiceitem_id").length) {
            initCanvas();
            window.addEventListener('orientationchange', function () {
                setTimeout(resizeCanvas, 500);/*call function after 500ms delay as the event is fired before the device hight and width changes*/
            });
            window.addEventListener('resize', function () {
                setTimeout(resizeCanvas, 500);
            });
            /*Handle the Add Image button*/
            $("#add_image_id").click(addImage);

            /*Handle the Doodle button*/
            $("#doodle_id").click(doodleText);

            /*Handle the Add Text button*/
            $("#add_text_id").click(function () {
                $("#add_text_id").css('background-image', 'url("images/add_text_overlay.png")');
                $("#doodle_id").css('background-image', 'url("images/doodle.png")');
                $("#add_image_id").css('background-image', 'url("images/add_img.png")');
                $("#font_details").css('display', 'inline');
                $("#canvas_text").css('display', 'inline');
            });

            /*Handle the Save/Done button*/
            $("#save").click(function () {
                readfile("res/board.txt");
                var timer = setInterval(function () {
                    if (filereadcomplete == true) {
                        saveChoice();
                        clearInterval(timer);
                    }
                }, 500);
                
            });

            /*Handle the Font drop down. Change the Canvas font on selection*/
            $("#font").change(function () {
                var selection = $(this).find(':selected').val();
                var font = "bold "+ selection+ " Georgia, serif"
                $("#canvas_text").css('font', font);
            });

            /*Handle the undo button*/
            $("#undo").click(undo);

            /*Event Listeners for textbox to add text on canvas. canvas_text textbox can be dragged on the page*/
            $("#canvas_text").on('touchstart', start);
            $("#canvas_text").on('touchmove', moveMe);
            $("#canvas_text").on('blur', addText);
        }
        
        /*Page to display the selected board*/
        if ($("#displayboard").length) {
            readfile("res/boardlist.txt");
            var boardtodisplay;
            var time = setInterval(function () {
                if (filereadcomplete == true) {
                    var boardname = localStorage.getItem('boardname');
                    for (var i = 0; i < boardlist.length; i++) {
                        if (boardname == boardlist[i].name)
                            boardtodisplay = boardlist[i];
                    }
                    displayBoard(boardtodisplay);
                    clearInterval(time);
                }
            }, 500);
        }
    };

    /*Function to display the selected board*/
    function displayBoard(board) {
        var url;
        
        var configobj = board.config;
        if (configobj.alignment == 'vertical') {
            for (var i = 1; i <= configobj.choices; i++) {
                var td_height = window.innerHeight - 150;
                $('#board_table').append('<tr><td><img id="img_r' + i + 'c1" src=""/></td></tr>');
                var celldata = board.boarddata;
                for (var j = 0; j < celldata.length; j++) {
                    if (celldata[j].id == "img_r" + i + "c1")
                        url = celldata[j].img;
                }
                if (url != null) {
                    $("#img_r" + i + "c1").attr('src', url);
                }
                if (configobj.choices == 3) {
                    td_height = td_height / 3;
                    $("#img_r" + i + "c1").addClass('new_board_td_valign_3_1');
                    $("#img_r" + i + "c1").css('height', td_height);
                } else if (configobj.choices == 2) {
                    td_height = td_height / 2;
                    $("#img_r" + i + "c1").addClass('new_board_td_valign_2_1');
                    $("#img_r" + i + "c1").css('height', td_height);
                }
                $('#img_r' + i + 'c1').on('touchend', function () {
                    $("#" + this.id).css('border', '4px solid rgb(255, 0, 0)');
                    var id = this.id;
                    setTimeout(function () { $("#" + id).css('border', '2px solid rgb(119, 119, 119)'); }, 1000);
                });
            }
            
        } else if (configobj.alignment == 'horizontal') {
            screen.lockOrientation('landscape');
            var top = parseInt($("#board_div").css("top"));
            $('#board_table').append('<tr></tr>');

            for (var i = 1; i <= configobj.choices; i++) {
                $('#board_table tr:first').append('<td><img id="img_r1c' + i + '" src=""/></td>');
                $("#img_r1c" + i).addClass('new_board_td_halign');
                var celldata = board.boarddata;
                for (var j = 0; j < celldata.length; j++) {
                    if (celldata[j].id == "img_r1c" + i)
                        url = celldata[j].img;
                }
                if (url != null) 
                    $("#img_r1c" + i).attr('src', url);
                $('#img_r1c' + i).on('touchend', function () {
                    $("#" + this.id).css('border', '4px solid rgb(255, 0, 0)');
                    var id = this.id;
                    setTimeout(function () { $("#" + id).css('border', '2px solid rgb(119, 119, 119)'); }, 1000);
                });
            }
            if (configobj.choices== 2)
                $("#board_table td").attr('width', '45%');
            if (configobj.choices == 3)
                $("#board_table td").attr('width', '30%');
            

        } else if (configobj.alignment == 'grid') {
            var top = parseInt($("#board_div").css("top"));
            for (var i = 1; i <= (configobj.choices / 2) ; i++) {
                $('#board_table').append('<tr id=' + '"r' + i + '"></tr>');
            }
            var i = 1;
            $("#board_table tr").each(function () {
                var td_height = window.innerHeight -  150;
                $(this).append('<td><img id=' + '"img_r' + i + 'c1" src="" alt="Add Picture/Text"/></td>');
                var celldata = board.boarddata;
                for (var j = 0; j < celldata.length; j++) {
                    if (celldata[j].id == "img_r" + i + "c1")
                        url = celldata[j].img;
                }
                if (url != null) {
                    $("#img_r" + i + "c1").attr('src', url);
                }

                $(this).append('<td><img id=' + '"img_r' + i + 'c2" src="" alt="Add Picture/Text"/></td>');
                var celldata = board.boarddata;
                for (var j = 0; j < celldata.length; j++) {
                    if (celldata[j].id == "img_r" + i + "c2")
                        url = celldata[j].img;
                }
                if (url != null) {
                    $("#img_r" + i + "c2").attr('src', url);
                }
                 if (configobj.choices == 4) {
                    $("#img_r" + i + "c1").addClass('new_board_td_grid_2_2');
                    $("#img_r" + i + "c2").addClass('new_board_td_grid_2_2');
                    td_height = td_height / 2;
                    $("#img_r" + i + "c1").css('height', td_height);
                    $("#img_r" + i + "c2").css('height', td_height);
                }
                else if (configobj.choices == 6) {
                    $("#img_r" + i + "c1").addClass('new_board_td_grid_3_2');
                    $("#img_r" + i + "c2").addClass('new_board_td_grid_3_2');
                    td_height = td_height / 3;
                    $("#img_r" + i + "c1").css('height', td_height);
                    $("#img_r" + i + "c2").css('height', td_height);
                }
                 $('#img_r' + i + 'c1').on('touchend', function () {
                     $("#" + this.id).css('border', '4px solid rgb(255, 0, 0)');
                     var id = this.id;
                     setTimeout(function () { $("#" + id).css('border', '2px solid rgb(119, 119, 119)'); }, 1000);
                 });
                 $('#img_r' + i + 'c2').on('touchend', function () {
                     $("#" + this.id).css('border', '4px solid rgb(255, 0, 0)');
                     var id = this.id;
                     setTimeout(function () { $("#" + id).css('border', '2px solid rgb(119, 119, 119)'); }, 1000);
                 });
                i++;
            });

            $("#board_table td").attr('width', '45%');

        }
    }

    /*Function to read the JSON data for saved boards from file and save it to boardlist array*/
    function readfile(filename) {
        filereadcomplete = false;
        var basepath = cordova.file.dataDirectory;
        window.resolveLocalFileSystemURL(basepath + filename, function (dir) {
            dir.file(function (file) {
                var reader = new FileReader();
                reader.onloadend = function (e) {
                    var boardobj = JSON.parse(this.result);
                    if (filename == "res/boardlist.txt")
                        boardlist = boardobj.boardlist;
                    if (filename == "res/board.txt")
                        board = boardobj;
                    filereadcomplete = true;
                }
                reader.readAsText(file);
            });
        }, function () {
            var fileTransfer = new FileTransfer();
            var url = cordova.file.applicationDirectory + "www/"+filename;
            fileTransfer.download(url, basepath + filename,
                function (entry) {
                    entry.file(function (file) {
                        var reader = new FileReader();
                        reader.onloadend = function (e) {
                            var boardobj = JSON.parse(this.result);
                            if (filename == "res/boardlist.txt")
                                boardlist = boardobj.boardlist;
                            if (filename == "res/board.txt")
                                board = boardobj;
                            filereadcomplete = true;
                        }
                        reader.readAsText(file);
                    });
                },
                function (err) {
                    console.dir(err);
                })
        });
    }

    /*Function to save selected configuration of new board to be created*/
    function saveConfiguration(id) {
        var board, align, numchoices;
        switch (id) {
            case "oneby2":
                align = "horizontal";
                numchoices = 2;
                break;
            case "oneby3":
                align = "horizontal";
                numchoices = 3;
                break;
            case "twoby1":
                align = "vertical";
                numchoices = 2;
                break;
            case "threeby1":
                align = "vertical";
                numchoices = 3;
                break;
            case "twoby2":
                align = "grid";
                numchoices = 4;
                break;
            case "threeby2":
                align = "grid";
                numchoices = 6;
                break;
        }
        var settings = {
            alignment: align,
            choices: numchoices
        };
        localStorage.setItem('settings', JSON.stringify(settings));
    }

    /*common function for page transitions*/
    function pageTransition(direction, destination) {
        window.plugins.nativepagetransitions.slide({
            'direction': direction,
            'duration': 400,
            'androiddelay': 50,
            'href': destination
        });
    }

    /*Function to save the choice item in local storage*/
    function saveChoice() {
        var dataUrl = canvas.toDataURL();                     
        var cellid = localStorage.getItem('current_selection');
        switch (cellid) {
            case "img_r1c1":
                board.img_r1c1 = dataUrl;
                break;
            case "img_r1c2":
                board.img_r1c2 = dataUrl;
                break;
            case "img_r1c3":
                board.img_r1c3 = dataUrl;
                break;
            case "img_r2c1":
                board.img_r2c1 = dataUrl;
                break;
            case "img_r2c2":
                board.img_r2c2 = dataUrl;
                break;
            case "img_r3c1":
                board.img_r3c1 = dataUrl;
                break;
            case "img_r3c2":
                board.img_r3c2 = dataUrl;
                break;
        }
        var text = JSON.stringify(board);
        window.resolveLocalFileSystemURL(cordova.file.dataDirectory + "res", function (dir) {
            dir.getFile("board.txt", { create: true }, function (file) {
                file.createWriter(function (fileWriter) {
                    
                    var blob = new Blob([text], { type: 'text/plain' });
                    fileWriter.write(blob);
                    fileWriter.onwriteend = function () {
                        pageTransition('right', window.history.back());
                    };
                });
            }, function (e) { JSON.stringify(e); });
        });
        
    }

    /*Function to save the newly created board in boardlist file*/
    function saveBoard() {
        var currentconfig = JSON.parse(localStorage.getItem('settings'));
        var boardname = $("#board_name").val();
        if (boardname == "") {
            $("#alert p").text("Add a name for the board");
            $("#alert").css('display', 'inline');
            $("#ok").click(function () { $("#alert").css('display', 'none'); });
            return;
        } else {
            var text = JSON.stringify(choices);
            window.resolveLocalFileSystemURL(cordova.file.dataDirectory + "res", function (dir) {
                dir.getFile("board.txt", { create: true }, function (f) {
                    f.createWriter(function (boardWriter) {

                        var blob = new Blob([text], { type: 'text/plain' });
                        boardWriter.write(blob);

                    });
                }, function (e) { JSON.stringify(e); });
            });
            readfile("res/boardlist.txt");
            var time = setInterval(function () {
                if (filereadcomplete == true) {
                    for (var i = 0; i < boardlist.length; i++) {
                        if (boardname == boardlist[i].name) {
                            $("#alert p").text("Name Already Exists");
                            $("#alert").css('display', 'inline');
                            $("#ok").click(function () { $("#alert").css('display', 'none'); });
                            clearInterval(time);
                            return;
                        }
                    }
                    var data = [];
                    $("img").each(function () {
                            var cellid = this.id;
                        var image = $("#" + cellid).attr('src');
                        var celldata = {
                            id: cellid,
                            img: image
                        };
                        data.push(celldata);
                    });
                    var screenshoturl;
                    html2canvas(document.getElementById("new_board_div"), {
                        onrendered: function (canvas) {
                            screenshoturl = canvas.toDataURL();

                            var boarditems = {
                                name: boardname,
                                config: currentconfig,
                                boarddata: data,
                                screenshot: screenshoturl
                            };
                            var textitem = JSON.stringify(boarditems) + ']}';
                            window.resolveLocalFileSystemURL(cordova.file.dataDirectory + "res", function (dir) {
                                dir.getFile("boardlist.txt", { create: true }, function (file) {
                                    file.createWriter(function (fileWriter) {
                                        if (fileWriter.length >= 17) { /*JSON with no boards has 16 characters*/
                                            textitem = ',' + textitem; /*if this is not the first entry add ,*/
                                        }
                                        fileWriter.seek(fileWriter.length - 2);
                                        var blob = new Blob([textitem], { type: 'text/plain' });
                                        fileWriter.write(blob);
                                        fileWriter.onwriteend = function () {
                                            pageTransition('right', 'index.html');
                                        };
                                    });
                                }, function (e) { JSON.stringify(e); });
                            });
                        }
                    });

                    
                    clearInterval(time);
                }
            }, 500);
        }
        
    }

    /*Function to init canvas height and width*/
    function initCanvas() {
        canvas = document.getElementById("canvas");
        var top = parseInt($("#canvas_div").css("top"));
        canvas.width = window.innerWidth- 40;
        canvas.height = window.innerHeight - top - 40; /*canvas height - canvas div position - margins and borders*/

        cstep = -1; /*variable to keep track of array of canvas states to implement undo operation*/
    }

    /*Functionadd the last canvas state as image to global array canvasarray*/
    function addLastState() {
        cstep++;
        if (cstep < canvasarray.length) { canvasarray.length = cstep; }
        canvasarray.push(canvas.toDataURL());                     
    }

    /*Function to handle undo of last action on canvas*/
    function undo() {
        /*get the previous image from canvasarray and draw it on current canvas*/
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (cstep > 0) {
            cstep--;
            var canvasPic = new Image();
            canvasPic.src = canvasarray[cstep];
            canvasPic.onload = function () { ctx.drawImage(canvasPic, 0, 0, canvas.width, canvas.height); }
        }
    }

    function addPicture(imageUri) {
        var context = canvas.getContext("2d");
        var base_image = new Image();
        base_image.src = imageUri;
        base_image.onload = function () {
            context.drawImage(base_image, 0, 0, canvas.width, canvas.height);
            addLastState();
        }
    }

    /*Function to doodle text on canvas*/
    function doodleText() {
        $("#add_text_id").css('background-image', 'url("images/add_text.png")');
        $("#doodle_id").css('background-image', 'url("images/doodle_overlay.png")');
        $("#add_image_id").css('background-image', 'url("images/add_img.png")');

        var context = canvas.getContext("2d");
        document.getElementById("canvas").addEventListener('touchstart', function (e) {
            var top = parseInt($("#canvas_div").css('top')) + 4;/*canvas_div position+ canvas padding*/
            var left = 4;/*canvas padding*/
            this.selected = true;
            context.beginPath();
            context.moveTo(e.changedTouches[0].pageX-left, e.changedTouches[0].pageY-top);
        });
        document.getElementById("canvas").addEventListener('touchmove', function (e) {
            e.preventDefault();
            var top = parseInt($("#canvas_div").css('top')) + 4;/*canvas_div position+ canvas padding*/
            var left = 4;/*canvas padding*/
            context.lineTo(e.changedTouches[0].pageX - left, e.changedTouches[0].pageY - top);
            context.lineWidth = 5;
            context.lineCap = "round";
            context.stroke();
        });
        document.getElementById("canvas").addEventListener('touchend', function (e) {
            context.closePath();
            addLastState();
            this.selected = false;
        });

    }

    /*Function to add image to canvas*/
    function addImage() {

        /*highlight the button being clicked with overlay background image. Restore other buttons*/
        $("#add_text_id").css('background-image', 'url("images/add_text.png")');
        $("#doodle_id").css('background-image', 'url("images/doodle.png")');
        $("#add_image_id").css('background-image', 'url("images/add_img_overlay.png")');

        var width = window.innerWidth - 10;
        var top = parseInt($("#canvas_div").css("top"));
        var height = window.innerHeight - top - 20;
        navigator.camera.getPicture(addPicture, function () { console.log("fail") }, { sourceType: Camera.PictureSourceType.PHOTOLIBRARY, targetWidth: width, targetHeight: height });
    }

    /*Function to add text on canvas*/
    function addText() {
        $("#add_text_id").css('background-image', 'url("images/add_text.png")');/*remove highlight from add text button if textbox is not shown*/
        if ($("#canvas_text").css('display') == "none")
            return;
        else {
            var text = $(this).val();
            $(this).val("");
            $(this).css('display', 'none');
            var context = canvas.getContext('2d');
            var topmargin = parseInt($("#canvas_text").css('top')) - parseInt($("#canvas_div").css('top'));
             var top = parseInt($(this).css('top')) - parseInt($("#canvas_div").css('top'));/*text position - div top - border*/
            //var top = parseInt($(this).css('top')) - 8;
             var left = parseInt($(this).css('left'))-8 ;
             
            var selection = $("#font").find(':selected').val();
            top = top + (parseInt(selection)) / 2;
            var font = "bold " + selection + " Georgia, serif"
            context.font = font;
            context.textBaseline = 'top';
            context.fillText(text, left, top);
            addLastState();
        }
    }

    function getImageURL(id) {
        switch (id) {
            case "img_r1c1":
                return board.img_r1c1;
            case "img_r1c2":
                return board.img_r1c2;
            case "img_r1c3":
                return board.img_r1c3;
            case "img_r2c1":
                return board.img_r2c1;
            case "img_r2c2":
                return board.img_r2c2;
            case "img_r3c1":
                return board.img_r3c1;
            case "img_r3c2":
                return board.img_r3c2;
        }
    }

    /*Function to read the boardlist array and create table to display the available boards*/
    function displayBoardList() {
        var boardnames = [];
        for (var i = 0; i < boardlist.length; i++) {
            boardnames.push(boardlist[i].name);
        }
        /*set the width of the table depending on the number of boards available*/
        var table_width;
        switch (boardnames.length) {
            case 1:
                $("#my_boards").addClass('my_boards_1');
                break;
            case 2:
                $("#my_boards").addClass('my_boards_2');
                break;
            default:
                $("#my_boards").addClass('my_boards_default');
                break;
        }
        
       // var td_width = Math.floor((window.innerWidth*30)/100);
        var rows = Math.floor(boardnames.length / 3);
        if (boardnames.length % 3 > 0)
            rows = rows + 1;
        for (var j = 0; j < rows; j++) {
            $('#my_boards').append('<tr id="r' + j + '"></tr>');
        }
        var i=0, r=0;
        $("#my_boards tr").each(function () {
            for (var j = 0; j < 3; j++) {
                if (i < boardnames.length) {
                    $(this).append('<td><div class = "td_div" id="r' + r + 'c' + j + '"><br/><span>' + boardnames[i] + '</span></div></td>');
                    $("#r" + r + "c" + j).css('background-image', 'url("' + boardlist[i].screenshot + '")');
                    $("#r" + r + "c" + j ).on('touchstart', start);
                    $("#r" + r + "c" + j).on('touchmove', moveMe);
                    $("#r" + r + "c" + j).on('touchend', function () { handleBoardTouchend(this.id) });
                    i++;
                }
            }
            r++;
        });
        $("#my_boards td").addClass('my_boards_td');
    }

    /*Function to handle touchstart event to get the initial postition before object is moved*/
    function start(e) {
        var orig = e.originalEvent;
        var pos = $(this).position();
        previouspos = pos; /*save this position in global variable for later use if the image is just moved, not deleted*/
        offset = {
            x: orig.changedTouches[0].pageX - pos.left,
            y: orig.changedTouches[0].pageY - pos.top
            };
    }

    /*Function to handle touchmove event*/
    function moveMe(e) {
        e.preventDefault();
        touchmove = true;
        var orig = e.originalEvent;
        $(this).css({
            position: 'absolute',
             top: orig.changedTouches[0].pageY - offset.y,
            left: orig.changedTouches[0].pageX - offset.x
        });
        var target = e.target;
        if (target.id == 'canvas_text')
            return;

        /*Continue further only if reached here from index page. Highlight the delete button when board image moves over it*/
        $("#" + target.id).css('width', '30%');
        var data = document.getElementById(target.id).getBoundingClientRect();
        var boardposition = {
            x: data.left,
            y: data.top
        };
        var data2 = document.getElementById("delete").getBoundingClientRect();
        var buttonposition = {
            x: data2.left,
            y: data2.top 
        };
        var diff = Math.sqrt(
            Math.pow(boardposition.x - buttonposition.x, 2) +
            Math.pow(boardposition.y - buttonposition.y, 2)
        );
        if (diff < 40) {
            $("#delete").removeClass('delete').addClass('deleteoverlay');
        }else
            $("#delete").removeClass('deleteoverlay').addClass('delete');
    }

    /*Function to handle touchend event of boards*/
    function handleBoardTouchend(id)
    {
        $("#" + id).css('width', '100%');
        /*If touchend event succeeds touchmove then delete the board if it has moved to delete button*/
        if (touchmove) {
            touchmove = false;
            var data = document.getElementById(id).getBoundingClientRect();
            var boardposition = {
                x: data.left,
                y: data.top
            };
            var data2 = document.getElementById("delete").getBoundingClientRect();
            var buttonposition = {
                x: data2.left,
                y: data2.top
            };
            /*shortest distance between the center of image and delete button*/
            var diff = Math.sqrt(
                Math.pow(boardposition.x - buttonposition.x, 2) +
                Math.pow(boardposition.y - buttonposition.y, 2)
            );
            if (diff < 40) {
                for (var i = 0; i < boardlist.length; i++) {
                    if (boardlist[i].name == $("#"+id).text())
                        break;
                }
                boardlist.splice(i, 1);
                var textitem = '{"boardlist":' + JSON.stringify(boardlist) + '}';
                window.resolveLocalFileSystemURL(cordova.file.dataDirectory + "res", function (dir) {
                    dir.getFile("boardlist.txt", { create: true }, function (file) {
                        file.createWriter(function (fileWriter) {
                            var blob = new Blob([textitem], { type: 'text/plain' });
                            fileWriter.write(blob);
                            fileWriter.onwriteend = function () {
                                $("#processing").css('display', 'none');
                                location.reload();
                            };
                        });
                    }, function (e) { console.log("file not found"); JSON.stringify(e); });
                });
                $("#processing").css('display', 'inline');
                $("#" + id).remove();
                /*if final position of image is not on the delete button, move it back to original position*/
            } else {
                $("#"+id).css({
                    top: previouspos.top,
                    left: previouspos.left
                });
                $("#"+id).css('position', 'initial');
            }
            return;
        }
         /*if touchend event does not succeed toucemove event then go to diplayboard page*/                   
        for (var k = 0; k < boardlist.length; k++) {
            if(boardlist[k].name== $("#"+id).text())
                localStorage.setItem('boardname', boardlist[k].name); 
        }
        pageTransition('left', 'displayboard.html');
    }

    /*Function to read configuration for new board from local storage and create a board*/
    function createNewBoard() {
        var configobj = JSON.parse(localStorage.getItem('settings'));
        var url;
        var top = parseInt($("#new_board_div").css("top"));
        
        if (configobj.alignment == 'vertical') {
            
            for (var i = 1; i <= configobj.choices; i++) {
                var td_height = window.innerHeight - top - 150;
                $('#new_board_table').append('<tr><td><img id=' + '"img_r' + i + 'c1" src="images/placeholder.png" alt="Add Picture/Text"/></td></tr>');
                url = getImageURL("img_r" + i + "c1");
                if (url != null) {
                    $("#img_r" + i + "c1").attr('src', url);
                } 
                $("#img_r" + i + "c1").on('touchend', function () {
                    current_selection = "r" + i + "c1";
                    localStorage.setItem('current_selection', this.id);
                    pageTransition('left', 'choiceitem.html');
                });
                if (configobj.choices == 3) {
                    td_height = td_height / 3;
                    $("#img_r" + i + "c1").addClass('new_board_td_valign_3_1');
                    $("#img_r" + i + "c1").css('height', td_height);
                } else if (configobj.choices == 2) {
                    td_height = td_height / 2;
                    $("#img_r" + i + "c1").addClass('new_board_td_valign_2_1');
                    $("#img_r" + i + "c1").css('height', td_height);
                }
            }
        } else if (configobj.alignment == 'horizontal') {
            screen.lockOrientation('landscape');
            $('#new_board_table').append('<tr></tr>');
            for (var i = 1; i <= configobj.choices; i++) 
                $('#new_board_table tr:first').append('<td><img id="img_r1c' + i + '" src="images/placeholder.png" alt="Add Picture/Text"/></td>');
            if (configobj.choices == 2)
                $("#new_board_table td").attr('width', '45%');
            if (configobj.choices == 3) {
                $("#new_board_table td").attr('width', '30%');
            }
            for (var i = 1; i <= configobj.choices; i++) {    
                $("#img_r1c" + i).addClass('new_board_td_halign');
                url = getImageURL("img_r1c" + i);
                if (url != null) {
                    $("#img_r1c" + i).attr('src', url);
                }
                $("#img_r1c" + i).on('touchend', function () {
                    current_selection = "r1c" + i;
                    localStorage.setItem('current_selection', this.id);
                    pageTransition('left', 'choiceitem.html');
                });
                
            }
            

        } else if (configobj.alignment == 'grid') {
            for (var i = 1; i <= (configobj.choices / 2) ; i++) {
                $('#new_board_table').append('<tr id=' + '"r' + i + '"></tr>');
            }
            var i = 1;
            $("#new_board_table tr").each(function () {
                var td_height = window.innerHeight - top - 150;
                $(this).append('<td><img id=' + '"img_r' + i + 'c1" src="images/placeholder.png" alt="Add Picture/Text"/></td>');
                url = getImageURL("img_r" + i + "c1");
                if (url != null) {
                    $("#img_r" + i + "c1").attr('src', url);
                }
                $("#img_r" + i + "c1").on('touchend', function () {
                    current_selection = "r" + i + "c1";
                    localStorage.setItem('current_selection', this.id);
                    pageTransition('left', 'choiceitem.html');
                });
                $(this).append('<td><img id=' + '"img_r' + i + 'c2" src="images/placeholder.png" alt="Add Picture/Text"/></td>');
                url = getImageURL("img_r" + i + "c2");
                if (url != null) {
                    $("#img_r" + i + "c2").attr('src', url);
                }
                $("#img_r" + i + "c2").on('touchend', function () {
                    current_selection = "r" + i + "c2";
                    localStorage.setItem('current_selection', this.id);
                    pageTransition('left', 'choiceitem.html');
                }); if (configobj.choices == 4){
                    $("#img_r" + i + "c1").addClass('new_board_td_grid_2_2');
                    $("#img_r" + i + "c2").addClass('new_board_td_grid_2_2');
                    td_height = td_height / 2;
                    $("#img_r" + i + "c1").css('height', td_height);
                    $("#img_r" + i + "c2").css('height', td_height);
                }
                else if (configobj.choices == 6){
                    $("#img_r" + i + "c1").addClass('new_board_td_grid_3_2');
                    $("#img_r" + i + "c2").addClass('new_board_td_grid_3_2');
                    td_height = td_height / 3;
                    $("#img_r" + i + "c1").css('height', td_height);
                    $("#img_r" + i + "c2").css('height', td_height);
                }
                i++;
            });

            $("#new_board_table td").attr('width', '45%');

        }
    }
    function resizeCanvas() {
        var ctx = canvas.getContext('2d');
        var tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        var tmpCtx = tempCanvas.getContext('2d');
 
        // Copy to temporary canvas
        tmpCtx.drawImage(canvas, 0, 0);
  
        // Resize original canvas
        var top = parseInt($("#canvas_div").css("top"));
        canvas.width = window.innerWidth - 40;
        canvas.height = window.innerHeight - top - 40; /*canvas height - canvas div position - margins and borders*/

        // Copy back to resized canvas
        ctx = canvas.getContext('2d');
        ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, canvas.width, canvas.height);
    }

    
    function onPause() {
        // TODO: This application has been suspended. Save application state here.
    };

    function onResume() {
        // TODO: This application has been reactivated. Restore application state here.
    };
} )();