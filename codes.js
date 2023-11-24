const fs = require("fs");
const blockhash = require("blockhash-core");
const { imageFromBuffer, getImageData } = require("@canvas/image");
const axios = require('axios');
const path = require('path');

const category = "traveling-equipment"
const url = `https://api.digikala.com/v1/categories/${category}/search/?seo_url=&page=`;
const startPage = 1;
const endPage = 10;
let id = 0;


async function hash(imgPath) {
    try {
        const data = await readFile(imgPath);
        const hash = await blockhash.bmvbhash(getImageData(data), 8);
        return hexToBin(hash);
    } catch (error) {
        console.log(error);
    }
}

function readFile(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) reject(err);
            resolve(imageFromBuffer(data));
        });
    });
}

function hexToBin(hexString) {
    const hexBinLookup = {
        0: "0000",
        1: "0001",
        2: "0010",
        3: "0011",
        4: "0100",
        5: "0101",
        6: "0110",
        7: "0111",
        8: "1000",
        9: "1001",
        a: "1010",
        b: "1011",
        c: "1100",
        d: "1101",
        e: "1110",
        f: "1111",
        A: "1010",
        B: "1011",
        C: "1100",
        D: "1101",
        E: "1110",
        F: "1111",
    };
    let result = "";
    for (i = 0; i < hexString.length; i++) {
        result += hexBinLookup[hexString[i]];
    }
    return result;
}

const imgFolder = "./images";

async function getFileNames() {
    return new Promise((resolve, reject) => {
        fs.readdir(imgFolder, (err, files) => {
            if (err) reject(err);
            resolve(files);
        });
    });
}

const refMap = new Map();

async function generateRefMap() {
    const files = await getFileNames();
    for (let i = 0; i < files.length; i++) {
        const imgHash = await hash(`${imgFolder}${files[i]}`);
        let valueArray;
        if (refMap.has(imgHash)) {
            const existingPaths = refMap.get(imgHash);
            valueArray = [...existingPaths, `${imgFolder}${files[i]}`];
        } else {
            valueArray = [`${imgFolder}${files[i]}`];
        }
        refMap.set(imgHash, valueArray);
    }
    console.log(refMap);
}

function calculateSimilarity(hash1, hash2) {
    if (!hash1 || !hash2) {
        // Handle the case where either hash is undefined
        console.error("Hash is undefined");
        return 0;
    }
    
    let similarity = 0;
    hash1Array = hash1.split("");
    hash1Array.forEach((bit, index) => {
        hash2[index] === bit ? similarity++ : null;
    });
    return parseInt((similarity / hash1.length) * 100);
}

async function compareImages(imgPath1, imgPath2) {
    const hash1 = await hash(imgPath1);
    const hash2 = await hash(imgPath2);
    return calculateSimilarity(hash1, hash2);
}

// compare all images in ./images folder with ./real-images.jpeg
async function compareAll() {
    const files = await getFileNames();
    for (let i = 0; i < files.length; i++) {
        const similarity = await compareImages(
            `${imgFolder}/${files[i]}`,
            "./real-image.jpeg"
        );

        // if similarity is more than 90% copy the image to ./codes folder
        if (similarity > 90) {
            fs.copyFile(
                `${imgFolder}/${files[i]}`,
                `./codes/${files[i]}`,
                (err) => {
                    if (err) throw err;
                    console.log(`${files[i]} was copied to ./codes`);
                }
            );
        }


    }
}

// compareAll();

const downloadFile = async (url, fileName) => {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });

    // const writer = fs.createWriteStream(fileName);

    // response.data.pipe(writer);

    // return new Promise((resolve, reject) => {
    //     writer.on('finish', resolve);
    //     writer.on('error', reject);
    // });

    const writer = fs.createWriteStream(fileName);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        //find similar images
        writer.on('finish', async () => {
            const similarity = await compareImages(
                fileName,
                "./real-image.jpg"
            );

            // if similarity is more than 90% copy the image to ./codes folder
            if (similarity > 80) {
                fs.copyFile(
                    fileName,
                    `./codes/${fileName}`,
                    (err) => {
                        if (err) throw err;
                        console.log(`${fileName} was copied to ./codes`);
                    }
                );
            }
            resolve();
        });
        writer.on('error', reject);
    })
};

const fetchData = async (page) => {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    };

    try {
        console.log(`Fetching Page ${page}...`);
        const products = await fetch(
            `${url}${page}`,
            { headers }
        )
            .then(res => res.json())
            .then(data => {
                return data.data.products;
            });

        for (const product of products) {
            const productId = product.id;

            try {
                const images = await fetch(
                    `https://api.digikala.com/v2/product/${productId}/`,
                    { headers }
                )
                    .then(res => res.json())
                    .then(data => {
                        return data.data.product.images.list;
                    });

                for (let index = 0; index < images.length; index++) {
                    const image = images[index];
                    id++;

                    const imageUrl = image.url[0].split('?')[0];
                    const imageName = path.join('images', `${id}-${productId}-${path.basename(imageUrl)}`);
                    try {
                        await downloadFile(imageUrl, imageName);
                    } catch (error) {
                        console.error(`Error downloading image: ${error.message}`);
                    }
                }
            } catch (error) {
                console.error(`Error On Fetching Products 💣💣💣: ${error.message}`);
            }
        }
    } catch (error) {
        console.error(`Error On Fetching Category 🧨🧨🧨: ${error.message}`);
    }
};

const start = async () => {
    for (let page = startPage; page <= endPage; page++) {
        await fetchData(page);
    }
}

start();