import { createServer } from 'http';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

const Data_File = join('Data', 'links.json');

const loadLinks = async () => {
    try {
        const data = await readFile(Data_File, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            await writeFile(Data_File, JSON.stringify({}));
            return {}
        }
    }
}

const saveLinks = async (links) => {
    try {
        await writeFile(Data_File, JSON.stringify(links));
    } catch (err) {
        console.error('Error saving links:', err);
    }
}


const server = createServer(async (req, res) => {
    if (req.method === "GET") {
        if (req.url === '/') {
            try {
                const data = await readFile(join('public', 'index.html'))
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            } catch {
                read.writeHead(404, { 'Content-Type': 'text/html' });
                res.write('<h1>404 Not Found</h1>');
                res.end();
            }
        } else if (req.url === '/links') {
            const links = await loadLinks();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(links));
        } else {
            const links = await loadLinks();
            const shortCode = req.url.slice(1);
            if (links[shortCode]) {
                res.writeHead(302, { Location: links[shortCode] });
                return res.end();
            }
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end("Shorted URL is not found");
        }
    }


    if (req.method === "POST" && req.url === '/shorten') {
        const links = await loadLinks();
        let body = ''
        req.on('data', chunk => {
            body += chunk;
        })
        req.on('end', async () => {
            const { url, shortenCode } = JSON.parse(body);
            if (!url) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end("URL is required");
            }

            const FinalShortCode = shortenCode || crypto.randomBytes(4).toString('hex');


            links[FinalShortCode] = url;
            await saveLinks(links);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end();
        })
    }

    else if (req.url.startsWith("/update/") && req.method === "PUT") {
        const oldShortCode = req.url.split('/')[2];

        let body = '';
        req.on('data', chunk => body += chunk.toString());

        req.on('end', async () => {
            try {
                const { url, shortenCode } = JSON.parse(body);
                const links = await loadLinks();

                if (!links[oldShortCode]) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Original short code not found' }));
                }

                if (oldShortCode === shortenCode) {
                    links[oldShortCode] = url;
                    await saveLinks(links);
                } else {
                    const url = links[oldShortCode];
                    delete links[oldShortCode];
                    links[shortenCode] = url;
                    await saveLinks(links);

                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ message: 'URL updated successfully' }));

            } catch (err) {
                console.error('Failed to update:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Invalid request body' }));
            }
        });
    }


    if (req.url.startsWith("/delete/") && req.method === "DELETE") {
        const shortCode = req.url.split('/')[2];
        const links = await loadLinks();
        if (links[shortCode]) {
            delete links[shortCode];
            await saveLinks(links);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message: 'Shortened URL deleted successfully' }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Shortened URL not found' }));
        }

    }


})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})

 
