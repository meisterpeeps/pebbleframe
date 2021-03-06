var express = require('express');
var bodyParser = require('body-parser');
var browserify = require('browserify-middleware');
var reactify = require('reactify');
var nunjucks = require('nunjucks');
var config = require('./client/config');

var OperationHelper = require('apac').OperationHelper;
var request = require('request');

var app = express();
app.use(express.static('public'));
app.use(bodyParser());

nunjucks.configure('server/templates/views', {
  express: app
});

app.get('/js/' + config.common.bundle, browserify(config.common.packages, {
  cache: true,
  precompile: true
}));

app.use('/js', browserify('./client/scripts', {
  external: config.common.packages,
  transform: ['reactify']
}));

app.get('*', function(req, res) {
  res.render('index.html');
});


var opHelper = new OperationHelper({
  awsId:     'AKIAIQ27TFDH7YXONTJQ',
  awsSecret: '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',
  assocId:   'bap071-20',
  version:   '2013-08-01'});

app.post('/general-query', function(req, res) {

  var query = req.body.query;
  
  opHelper.execute('ItemSearch', {
    'SearchIndex': 'Books',
    'Keywords': query,
    'ResponseGroup': 'ItemAttributes,Offers'
  }, function(err, results) { // you can add a third parameter for the raw xml response, "results" here are currently parsed using xml2js
    // console.log(results.ItemSearchResponse.Items[0].Item);

    var AmazonResultsToSend = results.ItemSearchResponse.Items[0].Item;
    
    request({
      url: 'http://api.walmartlabs.com/v1/search?query=' + query + '&format=json&apiKey=va35uc9pw8cje38csxx7csk8',
      json: true
      }, function (error, response, walmartBody) {
        if (!error && response.statusCode == 200) {
          // console.log(body.items);

          var WalmartResultsToSend = walmartBody.items;


          // 'http://api.remix.bestbuy.com/v1/products(search=game)?show=name,sku,salePrice&format=json&apiKey=n34qnnunjqcb9387gthg8625'

          request({
            url: 'http://api.remix.bestbuy.com/v1/products(search=' + query + ')?show=name,sku,salePrice&format=json&apiKey=n34qnnunjqcb9387gthg8625',
            json: true
            }, function (error, response, bestbuyBody) {
              if (!error && response.statusCode == 200) {
                var BestbuyResultsToSend = bestbuyBody.products;

                res.send([
                  {walmart: WalmartResultsToSend},
                  {amazon: AmazonResultsToSend},
                  {bestbuy: BestbuyResultsToSend}
                ]);
              }
            }
          );

        }
      }
    );

  });

});

var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log('Server listening on port ' + port);
});
