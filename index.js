const googleTrends = require('google-trends-api');
const axios = require('axios');
const cheerio = require('cheerio');


const searchResults = [];
let keywordList = [];
googleTrends.relatedQueries({keyword: 'kuran dinler'})
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

