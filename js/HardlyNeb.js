// TODO if error == 'contract check failed' (sp?) then mainnet vs testnet bug.
let NebPay = require("nebpay");
let nebPay = new NebPay();

function nebTest(method, args)
{
    nebRead(method, args, function(resp, error) 
    {
        console.log("---------------------------------------------------");
        console.log("resp: " + JSON.stringify(resp) + "; error: " + error);
    });
}

function nebWrite(method, args, listener, nas_to_send, receipt, error) 
{
    nebPay.call(contract_address, nas_to_send, method, JSON.stringify(args),
    {
        listener: function(resp)
        { 
            if(!resp.txhash)
            {
                error(resp);
                return;
            }
            if(listener)
            {
                listener(resp);
            }         
            if(receipt)
            {
                nebGetTxStatus(resp.txhash, receipt, error);
            }
        }
    });
}

function nebSend(to, listener, value, receipt, error)
{
    nebPay.pay(to, value, {listener: function(resp)
    {
        listener(resp);
        if(receipt)
        {
            nebGetTxStatus(resp.txhash, receipt, error);
        }
    }});           
}

function nebRead(method, args, listener) 
{
    nebPay.simulateCall(contract_address, 0, method, JSON.stringify(args), {
        listener: function(resp) 
        {
            var error = resp.execute_err;
            var result;
            if(!error) 
            {
                if(resp.result) 
                {
                    result = JSON.parse(resp.result);
                }
            } else 
            {
                console.log("Error: " + error);
            }
        
            listener(result, error, args);
        }
    });
}

// The nebulas API, used for signing transactions, etc
var nebulas = require("nebulas");
var neb = new nebulas.Neb();
neb.setRequest(new nebulas.HttpRequest(nebulas_domain));

function nebReadAnon(method, args, listener) 
{
     neb.api.call({
         from: contract_address, // Using the contract here so this can be called without loggin on.
         to: contract_address,
         value: 0,
         nonce: 0, // Nonce is irrelavant when read-only (there is no transaction charge)
         gasPrice: gas_price,
         gasLimit: gas_limit,
         contract: {function: method, args: JSON.stringify(args)} 
     }).then(function (resp) 
     {
        var error = resp.execute_err;
        var result;
        if(resp.result) 
        {
            result = JSON.parse(resp.result);
        } 
        else 
        {
            console.log("Error: " + error);
        }
    
        listener(result, error, args);      
     });        
 }

 function nebGetTxStatus(txhash, listener, error)
 {
    neb.api.getTransactionReceipt({hash: txhash}).then(function(resp)
    {
        if(resp.status > 1) 
        {
            setTimeout(function() 
            {
                nebGetTxStatus(txhash, listener, error);
            }, 3000);
            return;
        }

        if(!resp.execute_error)
        {
            listener(resp);
        } 
        else
        {
            error(resp.execute_error);
        }
    }).catch(error);
 }