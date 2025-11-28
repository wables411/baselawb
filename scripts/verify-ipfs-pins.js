import fs from 'fs';
import https from 'https';
import http from 'http';

// IPFS gateways to test
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.filebase.io/ipfs/'
];

/**
 * Convert IPFS URI to HTTP gateway URL
 */
function ipfsToGateway(ipfsUri, gateway) {
  if (!ipfsUri.startsWith('ipfs://')) {
    return null;
  }
  const path = ipfsUri.replace('ipfs://', '');
  return `${gateway}${path}`;
}

/**
 * Check if URL is accessible
 */
function checkUrl(url, timeout = 10000) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    const req = protocol.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          success: res.statusCode === 200,
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          size: data.length,
          gateway: url.split('/ipfs/')[0] + '/ipfs/'
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        gateway: url.split('/ipfs/')[0] + '/ipfs/'
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout',
        gateway: url.split('/ipfs/')[0] + '/ipfs/'
      });
    });
  });
}

/**
 * Verify IPFS URI across multiple gateways
 */
async function verifyIpfsUri(ipfsUri, sampleTokenIds = [0, 1, 2]) {
  console.log(`\n🔍 Verifying: ${ipfsUri}`);
  
  const results = {
    uri: ipfsUri,
    accessible: false,
    workingGateways: [],
    failedGateways: [],
    sampleChecks: []
  };
  
  // Extract CID and path pattern
  const match = ipfsUri.match(/ipfs:\/\/([^\/]+)(\/.*)?/);
  if (!match) {
    console.error(`   ❌ Invalid IPFS URI format`);
    return results;
  }
  
  const cid = match[1];
  const pathPattern = match[2] || '';
  
  // Test each gateway with sample token IDs
  for (const gateway of IPFS_GATEWAYS) {
    let gatewayWorking = false;
    const gatewayResults = [];
    
    for (const tokenId of sampleTokenIds) {
      const testPath = pathPattern.replace(/\d+/, tokenId.toString());
      const testUri = `ipfs://${cid}${testPath}`;
      const testUrl = ipfsToGateway(testUri, gateway);
      
      if (!testUrl) continue;
      
      const result = await checkUrl(testUrl);
      gatewayResults.push({
        tokenId,
        url: testUrl,
        ...result
      });
      
      if (result.success) {
        gatewayWorking = true;
        if (!results.workingGateways.includes(gateway)) {
          results.workingGateways.push(gateway);
        }
      }
    }
    
    if (gatewayWorking) {
      results.accessible = true;
      console.log(`   ✅ ${gateway} - Accessible`);
    } else {
      if (!results.failedGateways.includes(gateway)) {
        results.failedGateways.push(gateway);
      }
      console.log(`   ❌ ${gateway} - Not accessible`);
    }
    
    results.sampleChecks.push({
      gateway,
      results: gatewayResults
    });
  }
  
  return results;
}

/**
 * Verify metadata JSON structure
 */
async function verifyMetadata(metadataUri) {
  console.log(`\n📄 Verifying metadata structure: ${metadataUri}`);
  
  const match = metadataUri.match(/ipfs:\/\/([^\/]+)(\/.*)?/);
  if (!match) return null;
  
  const cid = match[1];
  const pathPattern = match[2] || '/0';
  
  // Try first working gateway
  const testUrl = ipfsToGateway(metadataUri.replace(/\d+/, '0'), IPFS_GATEWAYS[0]);
  if (!testUrl) return null;
  
  try {
    const result = await checkUrl(testUrl);
    if (result.success) {
      // Try to fetch and parse JSON
      return new Promise((resolve) => {
        const protocol = testUrl.startsWith('https:') ? https : http;
        protocol.get(testUrl, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              console.log(`   ✅ Metadata structure valid`);
              console.log(`      Name: ${json.name || 'N/A'}`);
              console.log(`      Description: ${json.description ? json.description.substring(0, 50) + '...' : 'N/A'}`);
              console.log(`      Image: ${json.image || 'N/A'}`);
              resolve({ valid: true, data: json });
            } catch (e) {
              console.log(`   ⚠️  Metadata is not valid JSON`);
              resolve({ valid: false, error: 'Invalid JSON' });
            }
          });
        }).on('error', () => {
          resolve({ valid: false, error: 'Fetch failed' });
        });
      });
    }
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Main verification function
 */
async function verifyIpfsPins(metadataUri, mediaUri, maxTokenId = 32) {
  console.log('🔍 IPFS Pin Verification Report');
  console.log('=' .repeat(60));
  
  const report = {
    timestamp: new Date().toISOString(),
    metadata: null,
    media: null,
    summary: {
      metadataAccessible: false,
      mediaAccessible: false,
      workingGateways: [],
      recommendations: []
    }
  };
  
  // Verify metadata
  if (metadataUri) {
    report.metadata = await verifyIpfsUri(metadataUri, [0, 1, Math.floor(maxTokenId / 2), maxTokenId - 1]);
    report.summary.metadataAccessible = report.metadata.accessible;
    
    // Verify metadata JSON structure
    const metadataCheck = await verifyMetadata(metadataUri);
    if (metadataCheck) {
      report.metadata.structure = metadataCheck;
    }
  }
  
  // Verify media
  if (mediaUri) {
    report.media = await verifyIpfsUri(mediaUri, [0, 1, Math.floor(maxTokenId / 2), maxTokenId - 1]);
    report.summary.mediaAccessible = report.media.accessible;
  }
  
  // Combine working gateways
  const allGateways = new Set();
  if (report.metadata) {
    report.metadata.workingGateways.forEach(g => allGateways.add(g));
  }
  if (report.media) {
    report.media.workingGateways.forEach(g => allGateways.add(g));
  }
  report.summary.workingGateways = Array.from(allGateways);
  
  // Generate recommendations
  if (!report.summary.metadataAccessible) {
    report.summary.recommendations.push('Metadata is not accessible. Consider re-pinning to IPFS.');
  }
  if (!report.summary.mediaAccessible) {
    report.summary.recommendations.push('Media is not accessible. Consider re-pinning to IPFS.');
  }
  if (report.summary.workingGateways.length === 0) {
    report.summary.recommendations.push('No gateways are working. Content may not be pinned properly.');
  }
  if (report.summary.workingGateways.length < 2) {
    report.summary.recommendations.push('Only one gateway is working. Consider using a pinning service for redundancy.');
  }
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`Metadata Accessible: ${report.summary.metadataAccessible ? '✅ Yes' : '❌ No'}`);
  console.log(`Media Accessible: ${report.summary.mediaAccessible ? '✅ Yes' : '❌ No'}`);
  console.log(`Working Gateways: ${report.summary.workingGateways.length}`);
  report.summary.workingGateways.forEach(g => console.log(`   - ${g}`));
  
  if (report.summary.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.summary.recommendations.forEach(rec => console.log(`   - ${rec}`));
  }
  
  // Save report
  const reportPath = 'ipfs-verification-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Full report saved to: ${reportPath}`);
  
  return report;
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  // Default URIs from user's examples
  const defaultMetadataUri = 'ipfs://QmWUmutQWNs475pjNpcJ5J3ZLTthYwMdd3obTyqqFiGvGb/0';
  const defaultMediaUri = 'ipfs://bafybeihxfyltqaawyqfdh442hzh6cdwms7nbodtk7qkfilgkftmd52xz3e/1.png';
  
  const metadataUri = args[0] || process.env.METADATA_URI || defaultMetadataUri;
  const mediaUri = args[1] || process.env.MEDIA_URI || defaultMediaUri;
  const maxTokenId = parseInt(args[2] || process.env.MAX_TOKEN_ID || '32', 10);
  
  console.log('IPFS Pin Verification');
  console.log(`Metadata URI: ${metadataUri}`);
  console.log(`Media URI: ${mediaUri}`);
  console.log(`Max Token ID: ${maxTokenId}`);
  
  await verifyIpfsPins(metadataUri, mediaUri, maxTokenId);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { verifyIpfsPins, verifyIpfsUri, verifyMetadata };

