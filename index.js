const express = require('express')
const serverless = require('serverless-http')
const app = express()
const { websiteScrappingService } = require('./src/services/scraping/web')

app.use(express.json())

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'testnoderabit'
    })
})

app.post('/scrapWebsite', async (req, res) => {
    try {
        const { links, domains, extractOptions } = req.body
        
        if (!links) {
            return res.status(400).json({
                status: 'error',
                message: 'Links are required'
            })
        }

        const linkArray = Array.isArray(links) ? links : links.split(',').map(link => link.trim())
        
        const results = await Promise.all(linkArray.map(async (link) => {
            try {
                const webDetails = {
                    link,
                    domains: domains || [],
                    extractOptions: extractOptions || {}
                }
                const scrapedData = await websiteScrappingService(webDetails, false)
                return {
                    link,
                    data: scrapedData,
                    timestamp: new Date()
                }
            } catch (err) {
                console.error(`Error scraping ${link}:`, err)
                return {
                    link,
                    error: err.message,
                    timestamp: new Date()
                }
            }
        }))

        res.json({ data: results })
    } catch (error) {
        console.error('Scraping error:', error)
        res.status(500).json({
            status: 'error',
            message: error.message || 'Internal server error'
        })
    }
})

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err)
    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    })
})

module.exports.handler = serverless(app)