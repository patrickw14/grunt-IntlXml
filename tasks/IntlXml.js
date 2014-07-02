/*
 * grunt-IntlXml
 * https://github.com/patrickw14/grunt-IntlXml
 *
 * Copyright (c) 2014 Patrick Wilson
 * Licensed under the MIT license.
 */

'use strict';

var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var chalk = require('chalk');
module.exports = function(grunt) {

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.task.registerMultiTask('intlxml', 'Ensures that the contents of your XML documents can be internationalized. (Built for ServiceNow)', function() {
    // Merge task-specific and/or target-specific options with these defaults.
    var done = this.async();

    var ignore = [
      'g:evaluate',
      'script',
      'g2:evaluate'
    ];

    var files = this.files.slice();

    function processFile(file) {
      var textArray = [];

      function getLeaves(node) {
        if (node instanceof Array) {
          for (var item in node) {
            if (ignore.indexOf(item) >= 0) continue;
            if (typeof(node[item]) === 'string') {
              textArray.push(node[item])
            } else {
              getLeaves(node[item]);
            }
          }
        } else {
          for (var property in node) {
            if (ignore.indexOf(property) >= 0) continue;
            if (property === '$') continue; //Here we need to handle certain attributes that should be internationalized.
            if (node[property] !== null && typeof(node[property]) === 'object') {
              getLeaves(node[property]);
            } else if (typeof(node[property]) === 'string') {
              textArray.push(node[property]);
            }
          }
        }
      }

      getLeaves(file);

      return textArray;
    }

    function stringIsLegal(str) {
      if (!str.match(/[a-zA-Z]/g)) return true;

      if (str.charAt(0) === '{' && str.charAt(1) === '{' 
          && str.charAt(str.length-1) === '}' && str.charAt(str.length-2) === '}') {
        return true;
      }

      if (str.charAt(0) === '$' && str.charAt(1) === '{') {
        return true
      }

      if (str.substring(0, 5) === '$[SP]') return stringIsLegal(str.substring(5));

      if (str.substring(str.length-5, str.length) === '$[SP]') return stringIsLegal(str.substring(0, str.length-5));

      if (!str.substring(0, 1).match(/[a-zA-Z]/g) && !((str.charAt(0) === '{' || str.charAt(0) === '$') && str.charAt(1) === '{' )) return stringIsLegal(str.substring(1));

      if (!str.substring(str.length-1).match(/[a-zA-Z]/g) && !(str.charAt(str.length-1) === '}' && str.charAt(str.length-2) === '}')) return stringIsLegal(str.substring(0, str.length - 1));

      return false;
    }

    function evaluateText(text) {
      var failedItems = [];
      for (var index in text) {
        var currItem = text[index].trim();
        if (!stringIsLegal(currItem)) {
          failedItems.push(currItem);
        }
      }
      return failedItems;
    }

    function process() {
      if (files.length <= 0) {
        done(0);
        return;
      }
      var failedFileCount = 0;

      files.pop().src.forEach(function(file) {
        var fileXml = grunt.file.read(file, { encoding: null });

        parser.parseString(fileXml, function (err, result) {
          if (err !== null) {
            grunt.log.writeln(chalk.bold(chalk.magenta(file)) + " - " + chalk.red("Compile Error..."));
            grunt.log.error(err);
          }
          var text = processFile(result);
          var failed = evaluateText(text);
          if (failed.length > 0) {
            failedFileCount += 1;
            grunt.log.writeln(chalk.bold(chalk.magenta(file)) + " - " + chalk.red(failed.length + " issue(s)"));
            failed.forEach(function(failedItem) {
              grunt.log.writeln("\t" + chalk.red("* ") + failedItem.trim());
            });
          }
        });
      });

      if (failedFileCount > 0) {
        grunt.log.error(failedFileCount + " files have failed.");
        grunt.log.error("Please wrap these strings in a ${gs.getMessage()} jelly script or equivalent to make them international-friendly.");
        done(1);
        return;
      }
      grunt.log.ok("Complete! :)");
      done(0);  
    }

    process();

  });

};
