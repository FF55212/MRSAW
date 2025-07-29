

    document.getElementById('createBtn').addEventListener('click', async () => {
      const adminKey = document.getElementById('adminKey').value.trim();
      const type = document.getElementById('keyType').value;
      const resultDiv = document.getElementById('result');

      resultDiv.textContent = '';
      resultDiv.className = '';

      if (!adminKey) {
        resultDiv.textContent = 'Admin API key is required.';
        resultDiv.className = 'error';
        return;
      }

      try {
        const response = await fetch('/api/createkey', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': adminKey
          },
          body: JSON.stringify({ type })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          resultDiv.textContent = `Success! Your key: ${data.key} (type: ${data.type})`;
          resultDiv.className = 'success';
        } else {
          resultDiv.textContent = `Error: ${data.msg || 'Failed to create key'}`;
          resultDiv.className = 'error';
        }
      } catch (err) {
        resultDiv.textContent = 'Network error: Could not reach the server.';
        resultDiv.className = 'error';
      }
    });
