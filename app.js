const axios = require('axios');
const fs = require('fs');
const path = require('path');


const category = "video-audio-entertainment"


const downloadFile = async (url, fileName) => {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });

    const writer = fs.createWriteStream(fileName);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

let id = 0;

const fetchData = async (page) => {
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    };

    try {
        console.log(`Fetching Page ${page}...`);
        const products = await fetch(
            `https://api.digikala.com/v1/categories/${category}/search/?seo_url=&page=${page}`,
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
    for (let page = 1; page <= 100; page++) {
        await fetchData(page);
    }
}

start();
