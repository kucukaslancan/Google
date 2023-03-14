const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const googleTrends = require('google-trends-api');
const cheerio = require('cheerio');

const searchResults = [];

// MongoDB bağlantısı
mongoose.connect('mongodb+srv://alpcan99:Cankcksln_61@cluster0.8cddnaj.mongodb.net/googlekiller', { useNewUrlParser: true, useUnifiedTopology: true });
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
      googleTrends.relatedQueries({keyword: req.body.keyword})
      .then((res) => {
          let data = JSON.parse(res);
          data.default.rankedList.forEach((item) => {
              item.rankedKeyword.forEach((val) => {
                  const keyVal = val['query'];
                  const searchUrl = `https://search.yahoo.com/search?p=${keyVal}`;
                    axios.get(searchUrl)
                      .then((response) => {
                        const html = response.data;
                        const $ = cheerio.load(html);

                        $('div[id="web"] div').each((i, el) => {
                          const resultTitle = $(el).find('h3').find('a').last().contents().filter(function() {
                            return this.nodeType === 3;
                          }).last().text().trim();
                          const resultDescription = $(el).find('div[class="compText aAbs"]').text();
                          
                          if (resultTitle && resultDescription) {
                            var data = JSON.stringify({
                              "keyword": keyVal,
                              "resultTitle": resultTitle,
                              "resultDescription": resultDescription
                            });
                            searchResults.push(resultDescription);
                            var config = {
                              method: 'post',
                              url: 'http://localhost:3000/GoogleResult',
                              headers: { 
                                'Content-Type': 'application/json'
                              },
                              data : data
                            };
                            
                            axios(config)
                            .then(function (response) {
                                console.log(JSON.stringify(response.data.status));
                            })
                            .catch(function (error) {
                              console.log(error);
                            });
                          
                          }
                        });
          
                      })
                      .catch((error) => {
                        console.log(error);
                      });
                  
              });
             
            });
           
          
         
      })
      .catch((err) => {
        console.log(err);
      })

      res.json(searchResults);
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
app.listen(3000, () => {
  console.log('Sunucu http://localhost:3000 adresinde çalışıyor.');
});
