const express = require('express');
const sql = require('mssql');
const router = express.Router();
const pool = require('./index.cjs'); 

// List of packages that have already been delivered or cancelled after being at the post office for too long
router.post('/package-history', async (req, res) => { 
    const { userID } = req.body

    if (!userID) {
        return res.status(400).json({ message: 'User is not logged in.' });
    }

    try {
        const result = await pool.request()
            .input('userID', sql.Int, userID)
            .query(`
                SELECT P.trackingNumber, S.state as status, P.packageContent, S.timeOfStatus
                FROM trackinginfo as T, statuses as S, package as P
                WHERE (T.senderUID = @userID OR T.receiverUID = @userID) AND P.trackingNumber = T.trackingNumber
                        AND S.SID = T.currentStatus AND (S.state = 'Delivered' OR S.state = 'Cancelled');
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching package history:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }    
});

// The same thing but now it's not Delivered or Cancelled packages
router.post('/package-status', async (req, res) => { 
    const { userID } = req.body

    if (!userID) {
        return res.status(400).json({ message: 'User is not logged in.' });
    }

    try {
        const result = await pool.request()
            .input('userID', sql.Int, userID)
            .query(`
                SELECT P.trackingNumber, S.state as status, S.timeOfStatus, A1.city as currentCity, A1.state as currentState, A2.city as nextCity, A2.state as nextState
                FROM trackinginfo as T, statuses as S, package as P, office  as currOffice, office as nextOffice, addresses as A1, addresses as A2
                WHERE (T.senderUID = @userID OR T.receiverUID = @userID) AND P.trackingNumber = T.trackingNumber
                        AND S.SID = T.currentStatus AND (S.state <> 'Delivered' OR S.state <> 'Cancelled') 
						AND S.currOID = currOffice.OID AND currOffice.officeAddress = A1.addressID
						AND S.nextOID = nextOffice.OID AND nextOffice.officeAddress = A2.addressID;
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching package status:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }    
});


// Returns what's in the package, the sender location and receiver location (full address)
router.post('/package-info', async (req, res) => { 
    const { trackingNumber } = req.body

    if (!trackingNumber) {
        return res.status(400).json({ message: 'Invalid tracking number.' });
    }

    try {
        // I couldn't figure out a cleaner way to do this part
        const result = await pool.request()
            .input('trackingNumber', sql.Int, trackingNumber)
            .query(` 
                SELECT senderAddress.streetAddress AS senderStreet, 
                        senderAddress.city AS senderCity,
                        senderAddress.state AS senderState,
                        senderAddress.zipcode AS senderZip,
                        receiverAddress.streetAddress AS receiverStreet, 
                        receiverAddress.city AS receiverCity,
                        receiverAddress.state AS receiverState,
                        receiverAddress.zipcode AS receiverZip,
                        package.packageContent
                FROM trackinginfo
                JOIN package ON package.trackingNumber = trackinginfo.trackingNumber
                JOIN addresses AS senderAddress ON trackinginfo.senderAddress = senderAddress.addressID
                JOIN addresses AS receiverAddress ON trackinginfo.receiverAddress = receiverAddress.addressID
                WHERE trackinginfo.trackingNumber = @trackingNumber;
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching package info:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }    
});

router.post('/add-package', async (req, res) => { 
    const { trackingNumber, role, userID } = req.body

    if (!trackingNumber || !role) {
        return res.status(400).json({ message: 'Nothing was entered.' });
    }

    if(!userID){
        return res.status(400).json({ message: 'User not logged in.' });
    }

    try {
        if(role === 'sender'){
            try {
                const result = await pool.request()
                    .input('trackingNumber', sql.Int, trackingNumber)
                    .input('userID', sql.Int, userID)
                    .query(` 
                        UPDATE trackinginfo
                        SET senderUID = @userID
                        WHERE trackingNumber = @trackingNumber;
                    `);
        
            } catch (error) {
                console.error('Error updating sender UID:', error.message);
                res.status(500).json({ message: 'Internal Server Error' });
            }  
        }else if(role === 'receiver'){
            const result = await pool.request()
                    .input('trackingNumber', sql.Int, trackingNumber)
                    .input('userID', sql.Int, userID)
                    .query(` 
                        UPDATE trackinginfo
                        SET receiverUID = @userID
                        WHERE trackingNumber = @trackingNumber;
                    `);
        }else{
            return res.status(400).json({ message: 'Invalid role.' });
        }
        
    } catch (error) {
        console.error('Error fetching package info:', error.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }    
});

module.exports = router;