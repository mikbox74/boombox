/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/worker.js":
/*!***********************!*\
  !*** ./src/worker.js ***!
  \***********************/
/***/ (() => {

eval("self.importScripts('jsmediatags.min.js');\n\nself.addEventListener('message', async (event) => {\n  let data = event.data;\n  if (data.type === 'playlist') {\n    for (let i = 0; i < data.payload.playlist.length; i++) {\n      let item = data.payload.playlist[i];\n      if (item.kind !== 'directory') {\n        let entry = item.instance;\n        let audioFile;\n        try {\n          if (typeof entry.getFile === 'function') {\n            audioFile = await entry.getFile();\n          } else {\n            audioFile = entry;\n          }\n          jsmediatags.read(audioFile, {\n            onSuccess: function(payload) {\n              self.postMessage({type: 'tags', i, payload});\n            },\n            // onError: function(error) {\n            //   console.log(error);\n            // }\n          });\n        } catch (e) {\n          console.error(e);\n        }\n      }\n    }\n  }\n});\n\n//# sourceURL=webpack:///./src/worker.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/worker.js"]();
/******/ 	
/******/ })()
;