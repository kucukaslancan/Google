const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const googleTrends = require('google-trends-api');
const cheerio = require('cheerio');

const searchResults = [];

// MongoDB bağlantısı
mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB bağlantı hatası:'));


// Veri modeli
const GoogleData = mongoose.model('GoogleData', {
  keyword: String,
  resultTitle: String,
  resultDescription: String
});

// Express uygulaması
const app = express();
app.use(bodyParser.json());


// Yeni kullanıcı ekleme
app.post('/GoogleResult', (req, res) => {
    const user = new GoogleData(req.body);
    user.save()
      .then(() => res.json({status:true}))
      .catch((err) => console.log(err));
  });
  
  // google sonuçlarını getir
  app.get('/GetResult', async (req, res) => {
    const eachCount = 20;
    let keywordList = [];
    
    try {
      const googleRes = await googleTrends.relatedQueries({ keyword: req.body.keyword });
      const data = JSON.parse(googleRes);
      const requests = [];
  
      data.default.rankedList.forEach((item) => {
        item.rankedKeyword.forEach((val) => {
          const keyVal = val.query;
          const searchUrl = `https://search.yahoo.com/search?p=${keyVal}`;
  
          requests.push(
            axios.get(searchUrl).then((response) => {
              const html = response.data;
              const $ = cheerio.load(html);
              const results = [];
  
              $('div[id="web"] div').each((i, el) => {
                const resultTitle = $(el).find('h3').find('a').last().contents().filter(function() {
                  return this.nodeType === 3;
                }).last().text().trim();
                const resultDescription = $(el).find('div[class="compText aAbs"]').text();
  
                if (resultTitle && resultDescription) {
                  results.push({
                    keyword: keyVal,
                    resultTitle: resultTitle,
                    resultDescription: resultDescription
                  });
                }
              });

              
              const config = {
                method: 'post',
                url: 'https://googlekllr.herokuapp.com/GoogleResult',
                headers: { 'Content-Type': 'application/json' },
                data: results
              };
          
              axios(config).then((response) => {
                console.log(JSON.stringify(response.data.status));
              }).catch((error) => {
                console.log(error);
              });
  
              return results;
            }).catch((error) => {
              console.log(error);
            })
          );
        });
      });
  
      const searchResults = await Promise.all(requests).then((responses) => {
        return responses.flat();
      });
  
  
      res.json(searchResults);
  
    } catch (error) {
      console.log(error);
    }
  });
  
 
// tüm kayıtları sil
app.post('/deleteAll', async (req, res) => {
    await GoogleData.deleteMany();
    res.json({ message: 'Kullanıcılar silindi.' });
  });



// Axios kullanarak başka bir API'ye istek gönderme
app.get('/external-api', async (req, res) => {
  const response = await axios.get('https://jsonplaceholder.typicode.com/posts');
  res.json(response.data);
});

// Sunucuyu başlatma
app.listen(process.env.PORT || 3000, () => {
  console.log('Sunucu '+process.env.PORT+' adresinde çalışıyor.');
});
