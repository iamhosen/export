const fs = require("fs");
const blockhash = require("blockhash-core");
const { imageFromBuffer, getImageData } = require("@canvas/image");

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

compareAll();