'use strict';

const fm = require('front-matter');
const puppeteer = require('puppeteer');
const gulp = require('gulp');
const tap = require('gulp-tap');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

gulp.task("generate-feature", function () {
    return gulp.src(["**/*.md", "!node_modules/**/*"])
        .pipe(tap(async (file) => {
            const attributes = fm(file.contents.toString()).attributes;
            const template = fs.readFileSync('template.html').toString();
            const date = moment(attributes.date);
            const html = template.replace('[[TITLE]]', attributes.title)
                .replace('[[AUTHOR]]', attributes.author)
                .replace('[[DATE]]', date.format('MMM d'));
            fs.writeFileSync('tmp.html',html);
            
            const browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            await page.setViewport({
                width: 1200,
                height: 600,
                deviceScaleFactor: 1,
            });
            let blah = path.resolve("tmp.html");
            console.log(blah.toString());
            await page.goto(`file://${blah.toString()}`);
            await page.screenshot({ path: "test.png" });
            await browser.close();
        }));
});