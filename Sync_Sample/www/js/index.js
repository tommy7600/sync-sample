/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    path: '',
    filter: /^\/(.*)\//,
    eventFolder: "",
    db: undefined,
    count_success: 0,
    total_file: 0,
    total_data: [],
    jsonData: undefined,
    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    bindEvents: function () {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function () {
        console.log("Document is ready");
        var pathName = window.location.pathname.split("/"),
            content_json = "http://contentcontent.eu01.aws.af.cm/json",
            content_json_local = "http://content.loc/json";

        pathName.splice(-3, 3);
        var documantFolder = window.location.protocol + '//' + pathName.join("/") + "/Documents";
        window.resolveLocalFileSystemURI(documantFolder + "/" + "ancestor-page", function () {
            var path = window.location.pathname.split("/");
            path.pop();
            window.location.replace(path.join("/") + "/page.html");
        }, function () {
            app.updateFileList(content_json_local, "ancestor-page");
        });
    },

    readFileList: function (file, folderName, option) {
        var reader = new FileReader();
        reader.onloadend = function (evt) {
            app.jsonData = JSON.parse(evt.target.result);
            app.total_file = app.jsonData.CACHE.length;
            for (var i = 0, len_json = app.jsonData.CACHE.length; i < len_json; i++) {
                var page = app.jsonData.CACHE[i];
                for (var j = 0, len_page = page.data.length; j < len_page; j++) {
                    app.total_data.push({
                        url: page.data[j].url,
                        folderName: page.folder
                    });
                }
            }
            app.downloadItem(app.total_data);
            $('.progressFile').empty().append("<h1>Still " + app.jsonData.TotalSize + " bytes to go!</h1>");
        };
        reader.readAsText(file);
    },
    downloadItem: function (data) {
        var numSuccess = 0,
            pathBis = "",
            url = "",
            page = undefined,
            folder = "",
            jsonStringData = "",
            fileTransfer = undefined;
        if (data.length > 0) {
            var elt = data.pop();
            url = elt.url;
            var folderName = elt.folderName;
            pathBis = app.path + folderName + "/" + elt.url.split('/').pop();
            fileTransfer = new FileTransfer();
            fileTransfer.onprogress = function (progressEvent) {
                if (progressEvent.lengthComputable) {
                    var percent = (progressEvent.loaded / progressEvent.total) * 600;
                    $(".progressbar-inner").width(percent);
                }
            };
            fileTransfer.download(
                url, pathBis, function (entry) {
                    app.count_success++;
                    numSuccess++;
                    var image_formats = "";
                    image_formats.replace(/ (png|jpg|jpeg)$/gi, "");
//                    $('.progressFile').empty().append("<h1>Still " + (jsondata.CACHE.length - numSuccess) + " files to go</h1>");
                    $('.progressFile').empty().append("<h1>Still " + data.length + " files to go</h1>");
                    if (entry.name.indexOf("mp4") != -1) {
                        $('body').append("<video width=\"320\" height=\"240\" controls><source src=\"" + entry.fullPath + "\" type=\"video/mp4\"></video>");
                    }
                    else if (entry.name.indexOf(image_formats) != -1) {
                        $('body').append("<img width=\"200px\" height=\"200px\" src=\"" + entry.fullPath + "\" />");
                    }
                    $(".progressbar-inner").width(0);
                    app.downloadItem(data);
                }, function (error) {
                    console.log("Download error, target: " + elt.url);
                    app.downloadItem(data);
                });
        }
        else {
            var writeContentJson = function (jsonStringData, folder) {
                window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
                    fileSystem.root.getFile(folder + "content.json", {create: true}, function (fileEntry) {
                        fileEntry.createWriter(function (writer) {
                            writer.write(jsonStringData);
                        }, app.fail);
                    }, app.fail);
                }, app.fail);
            }
            for (var i = 0, len_json = app.jsonData.CACHE.length; i < len_json; i++) {
                page = app.jsonData.CACHE[i];
                folder = page.folder;
                jsonStringData = JSON.stringify(page);
                writeContentJson(jsonStringData, folder);
            }
//            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
//                for (var i = 0, len_json = app.jsonData.CACHE.length; i < len_json; i++) {
//                    page = app.jsonData.CACHE[i];
//                    folder = page.folder;
//                    jsonStringData = JSON.stringify(page);
//                    fileSystem.root.getFile(folder + "content.json", {create: true}, function (fileEntry) {
//                        fileEntry.createWriter(function (writer) {
//                            writer.onwriteend = function () {
//                                i++;
//                            }
//                            writer.write(jsonStringData);
//                        }, app.fail);
//                    }, app.fail);
//                }
//            }, app.fail);
        }
    },

    fail: function (evt) {
        console.log(evt.target.error.code);
    },

    updateFileList: function (fileListUrl, folderName, option) {
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {
            fileSystem.root.getFile("fileList", {create: true}, function (fileEntry) {
                app.path = app.filter.exec(fileEntry.fullPath)[0];
                var fileTransfer = new FileTransfer();
                var fileListPath = app.path + "fileList";
                fileTransfer.download(
                    fileListUrl, fileListPath,
                    function (entry) {
                        entry.file(function (file) {
                            app.readFileList(file, folderName);
                        }, app.fail);
                    }, function (error) {
                        console.log("Download file list error: " + error.source);
                    });
            }, app.fail);
        }, app.fail);
    }
};
