'use strict';

const fm = require('front-matter');
const puppeteer = require('puppeteer');
const gulp = require('gulp');
const tap = require('gulp-tap');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const slugify = require('slugify');

const VIEWPORT_OPTIONS = {
    width: 1200,
    height: 600,
    deviceScaleFactor: 1
};

const TEMPLATE_DIRECTORY = 'template';
const TMP_DIRECTORY = 'tmp';
const OUTPUT_DIRECTORY = 'out';

const AUTHOR_IMAGE = 'author.jpg';
const STYLE_CSS = 'style.css';
const HTML_TEMPLATE = 'template.html';

async function generateFeatureImage(file) {

    // Parse the front matter for the article attributes like title
    console.log(`Frontmatter to HTML ${JSON.stringify(file.history)}...`);
    const attributes = fm(file.contents.toString()).attributes;
    const date = moment(attributes.date);

    // copy css to tmp directory so it can be rendered
    fs.copyFileSync(`${TEMPLATE_DIRECTORY}/${STYLE_CSS}`, `${TMP_DIRECTORY}/${STYLE_CSS}`);

    // copy author image to tmp directory so it can be rendered
    fs.copyFileSync(`${TEMPLATE_DIRECTORY}/${AUTHOR_IMAGE}`, `${TMP_DIRECTORY}/${AUTHOR_IMAGE}`);

    // Build the html template
    const template = fs.readFileSync(`${TEMPLATE_DIRECTORY}/${HTML_TEMPLATE}`).toString();
    const html = template.replace('[[TITLE]]', attributes.title)
        .replace('[[AUTHOR]]', attributes.author)
        .replace('[[DATE]]', date.format('MMM Do'));

    // render the HTML then take a image snapshot of it
    console.log(`HTML to image ${JSON.stringify(file.history)}...`);
    let htmlFile = null;
    const browser = await puppeteer.launch({ headless: true });

    try {
        const slug = slugify(attributes.title, { replacement: '_', remove: /[*+~.()'"!?:@]/g, lower: true });
        htmlFile = `${TMP_DIRECTORY}/${slug}.html`;
        const outputFilename = `${slug}.jpg`;

        // Save the html to disk so we can load it into Puppeteer, this is required so images and fonts render
        fs.writeFileSync(htmlFile, html);
        let htmlFilePath = `file://${path.resolve(htmlFile)}`;
        const page = await browser.newPage();
        await page.setViewport(VIEWPORT_OPTIONS);

        console.log(`Saving feature image ${outputFilename}`);
        await page.goto(htmlFilePath);
        await page.screenshot({ path: `${OUTPUT_DIRECTORY}/${outputFilename}` });
    } catch (e) {
        console.log(e);
    } finally {
        if (browser) {
            await browser.close();
        }

        // delete the html file from disk
        console.log(path.resolve(`${TMP_DIRECTORY}/`));
        let tempFiles = fs.readdirSync(path.resolve(`${TMP_DIRECTORY}/`));

        for (const file of tempFiles) {
            fs.unlinkSync(`${TMP_DIRECTORY}/${file}`);
        }
    }
}

function createDirectoryIfNotExists(directory) {

    if (!fs.existsSync(directory)){
        fs.mkdirSync(directory);
    }
}

gulp.task("generate-feature-image", function () {
    createDirectoryIfNotExists(OUTPUT_DIRECTORY);
    createDirectoryIfNotExists(TMP_DIRECTORY);

    return gulp.src(["../../content/post/md-to-pdf.md", "!node_modules/**/*"])
        .pipe(tap(async (file) => await generateFeatureImage(file)));;
});